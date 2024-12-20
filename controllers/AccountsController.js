import UserModel from '../models/user.js';
import PostModel from '../models/post.js';
import Repository from '../models/repository.js';
import TokenManager from '../tokensManager.js';
import * as utilities from "../utilities.js";
import Gmail from "../gmail.js";
import Controller from './Controller.js';
import AccessControl from '../accessControl.js';
import Post from '../models/post.js';

export default class AccountsController extends Controller {
    constructor(HttpContext) {
        super(HttpContext, new Repository(new UserModel()), AccessControl.admin());
    }
    index(id) {
        if (id != '') {
            if (AccessControl.readGranted(this.HttpContext.authorizations, AccessControl.admin()))
                this.HttpContext.response.JSON(this.repository.get(id));
            else
                this.HttpContext.response.unAuthorized("Unauthorized access");
        }
        else {
            if (AccessControl.granted(this.HttpContext.authorizations, AccessControl.admin()))
                this.HttpContext.response.JSON(this.repository.getAll(this.HttpContext.path.params), this.repository.ETag, false, AccessControl.admin());
            else
                this.HttpContext.response.unAuthorized("Unauthorized access");
        }
    }
    // POST: /token body payload[{"Email": "...", "Password": "..."}]
    login(loginInfo) {
        if (loginInfo) {
            if (this.repository != null) {
                let user = this.repository.findByField("Email", loginInfo.Email);
                if (user != null) {
                    if (user.Authorizations.readAccess == -1)
                        this.HttpContext.response.unAuthorized('Votre compte a été bloqué par un administrateur.');
                    else if (user.Password == loginInfo.Password) {
                        user = this.repository.get(user.Id);
                        let newToken = TokenManager.create(user);
                        this.HttpContext.response.created(newToken);
                    } else {
                        this.HttpContext.response.wrongPassword("Wrong password.");
                    }
                } else
                    this.HttpContext.response.userNotFound("This user email is not found.");
            } else
                this.HttpContext.response.notImplemented();
        } else
            this.HttpContext.response.badRequest("Credential Email and password are missing.");
    }
    logout() {
        let userId = this.HttpContext.path.params.userId;
        if (userId) {
            TokenManager.logout(userId);
            this.HttpContext.response.ok();
        } else {
            this.HttpContext.response.badRequest("UserId is not specified.")
        }
    }
    sendVerificationEmail(user) {
        // bypass model bindeExtraData wich hide the user verifyCode
        let html = `
                Bonjour ${user.Name}, <br /> <br />
                Voici votre code pour confirmer votre adresse de courriel
                <br />
                <h3>${user.VerifyCode}</h3>
            `;
        const gmail = new Gmail();
        gmail.send(user.Email, 'Vérification de courriel...', html);
    }

    sendConfirmedEmail(user) {
        let html = `
                Bonjour ${user.Name}, <br /> <br />
                Votre courriel a été confirmé.
            `;
        const gmail = new Gmail();
        gmail.send(user.Email, 'Courriel confirmé...', html);
    }

    //GET : /accounts/verify?id=...&code=.....
    verify() {
        if (this.repository != null) {
            let id = this.HttpContext.path.params.id;
            let code = parseInt(this.HttpContext.path.params.code);
            let userFound = this.repository.findByField('Id', id);
            if (userFound) {
                if (userFound.VerifyCode == code) {
                    userFound.VerifyCode = "verified";
                    this.repository.update(userFound.Id, userFound, false);
                    if (this.repository.model.state.isValid) {
                        userFound = this.repository.get(userFound.Id); // get data binded record
                        this.HttpContext.response.JSON(userFound);
                        this.sendConfirmedEmail(userFound);
                    } else {
                        this.HttpContext.response.unprocessable();
                    }
                } else {
                    this.HttpContext.response.unverifiedUser("Verification code does not match.");
                }
            } else {
                this.HttpContext.response.unprocessable();
            }
        } else
            this.HttpContext.response.notImplemented();
    }
    //GET : /accounts/conflict?Id=...&Email=.....
    conflict() {
        if (this.repository != null) {
            let id = this.HttpContext.path.params.Id;
            let email = this.HttpContext.path.params.Email;
            if (id && email) {
                let prototype = { Id: id, Email: email };
                this.HttpContext.response.JSON(this.repository.checkConflict(prototype));
            } else
                this.HttpContext.response.JSON(false);
        } else
            this.HttpContext.response.JSON(false);
    }
    // POST: account/register body payload[{"Id": 0, "Name": "...", "Email": "...", "Password": "..."}]
    register(user) {
        if (this.repository != null) {
            user.Created = utilities.nowInSeconds();
            let verifyCode = utilities.makeVerifyCode(6);
            user.VerifyCode = verifyCode;
            user.Authorizations = AccessControl.userReadOnly();
            let newUser = this.repository.add(user);
            if (this.repository.model.state.isValid) {
                this.HttpContext.response.created(newUser);
                newUser.VerifyCode = verifyCode;
                this.sendVerificationEmail(newUser);
            } else {
                if (this.repository.model.state.inConflict)
                    this.HttpContext.response.conflict(this.repository.model.state.errors);
                else
                    this.HttpContext.response.badRequest(this.repository.model.state.errors);
            }
        } else
            this.HttpContext.response.notImplemented();
    }
    promote(user) {
        if (this.repository != null) {
            let storedUser = this.repository.findByField("Id", user.Id);
            let userExtraData = this.repository.get(user.Id);

            if (userExtraData.isAdmin) storedUser.Authorizations = AccessControl.userReadOnly();
            else if (userExtraData.isSuperUser) storedUser.Authorizations = AccessControl.admin();
            else storedUser.Authorizations = AccessControl.superUser();

            this.repository.update(user.Id, storedUser, false);
            let updatedUser = this.repository.get(user.Id); // must get record user.id with binded data
            if (this.repository.model.state.isValid)
                this.HttpContext.response.JSON(updatedUser);
            else
                this.HttpContext.response.badRequest(this.repository.model.state.errors);
        } else
            this.HttpContext.response.notImplemented();
    }
    block(user) {
        if (this.repository != null) {
            let storedUser = this.repository.findByField("Id", user.Id);
            let userExtraData = this.repository.get(user.Id);

            if (userExtraData.isBlocked) storedUser.Authorizations = AccessControl.userReadOnly();
            else storedUser.Authorizations = AccessControl.blocked();

            this.repository.update(user.Id, storedUser, false);
            let updatedUser = this.repository.get(user.Id); // must get record user.id with binded data
            if (this.repository.model.state.isValid)
                this.HttpContext.response.JSON(updatedUser);
            else
                this.HttpContext.response.badRequest(this.repository.model.state.errors);
        } else
            this.HttpContext.response.notImplemented();
    }
    // PUT:account/modify body payload[{"Id": 0, "Name": "...", "Email": "...", "Password": "..."}]
    modify(user) {
        // empty asset members imply no change and there values will be taken from the stored record
        if (AccessControl.writeGranted(this.HttpContext.authorizations, AccessControl.userReadOnly())) {
            if (this.repository != null) {
                user.Created = utilities.nowInSeconds();
                let foundedUser = this.repository.findByField("Id", user.Id);
                if (foundedUser != null) {
                    user.Authorizations = foundedUser.Authorizations; // user cannot change its own authorizations
                    if (user.Password == '') { // password not changed
                        user.Password = foundedUser.Password;
                    }
                    user.Authorizations = foundedUser.Authorizations;
                    if (user.Email != foundedUser.Email) {
                        user.VerifyCode = utilities.makeVerifyCode(6);
                        this.sendVerificationEmail(user);
                    } else {
                        user.VerifyCode = foundedUser.VerifyCode;
                    }
                    this.repository.update(user.Id, user);
                    let updatedUser = this.repository.get(user.Id); // must get record user.id with binded data

                    if (this.repository.model.state.isValid) {
                        this.HttpContext.response.JSON(updatedUser, this.repository.ETag);
                    }
                    else {
                        if (this.repository.model.state.inConflict)
                            this.HttpContext.response.conflict(this.repository.model.state.errors);
                        else
                            this.HttpContext.response.badRequest(this.repository.model.state.errors);
                    }
                } else
                    this.HttpContext.response.notFound();
            } else
                this.HttpContext.response.notImplemented();
        } else
            this.HttpContext.response.unAuthorized();
    }

    // GET:account/remove/id
    remove(id) {
        let userId = this.HttpContext.path.params.userToRemove;
        let resquestedByAdmin = this.HttpContext.path.params.requestByAdmin === 'true';
        let permissionGranted = false;

        if (this.repository != null) {
            let storedUser = this.repository.findByField("Id", userId);
            if (storedUser != null) {
                if (resquestedByAdmin)
                    permissionGranted = AccessControl.writeGranted(this.HttpContext.authorizations, AccessControl.admin())
                else
                    permissionGranted = this.HttpContext.user.Id == storedUser.Id

                if (permissionGranted) {
                    PostModel.removeLikes(id);
                    this.repository.remove(id)
                    let removed = !(this.repository.get(id));

                    if (this.repository.model.state.isValid)
                        this.HttpContext.response.JSON(removed);
                    else if (this.repository.model.state.inConflict)
                        this.HttpContext.response.conflict(this.repository.model.state.errors);
                    else
                        this.HttpContext.response.badRequest(this.repository.model.state.errors);
                } else
                    this.HttpContext.response.unAuthorized();
            } else
                this.HttpContext.response.notFound();
        } else
            this.HttpContext.response.notImplemented();
    }
}