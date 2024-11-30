//#region User form rendering
const TIMEOUT_TIME = 1800
let sessionUser = sessionStorage.getItem('user') == 'undefined' ? null : JSON.parse(sessionStorage.getItem('user'));
if (sessionUser != null) {
    initTimeout(TIMEOUT_TIME, logout);
    timeout();
}
let verifyMessage = `
    Votre compte a été crée. Veuillez
    vérifier vos courriels, afin de récupérer votre code de vérification
    pour votre prochaine connexion. Merci !`
var userToVerify;

function changeMainTitle(msg = 'Fil de nouvelles', color = null) {
    $('#viewTitle').text(msg);
    $('#viewTitle').css('color', color || 'black');
}
function newUser() {
    let User = {};
    User.Id = "0";
    User.Name = "";
    User.Email = "";
    User.Password = "";
    User.Avatar = "no-avatar.png";
    User.Created = 0;
    User.Authorizations = {}
    User.VerifyCode = ""
    return User;
}
function isSuperUser(user) {
    return user.Authorizations.readAccess == 2 && user.Authorizations.writeAccess == 2;
}
async function renderVerification(errorMsg = "") {
    $('#form').show();
    $('#form').empty();
    $("#form").append(`
        <form class="form" id="verifyForm">
            <label for="verifyInput" class="form-label">Veuillez entrer le code de vérification que vous aviez reçu par courriel</label>
            <input class="form-control" placeholder="Code de vérification" id="verifyInput" name="verifyInput"/>
            <span id="errorMsg" style="display:${errorMsg ? "block" : "none"}; color:'red'; font-weight:'bold';">${errorMsg}</span>
            <input class="btn btn-primary" type="submit" value="Vérifier" />
        </form>
    `);
    $('#verifyForm').on('submit', async function (event) {
        event.preventDefault();
        let code = $("#verifyInput").val();
        if (code === "")
            renderVerification('Veuillez saisir une entrée dans ce champ');
        else {
            let response = await Accounts_API.Verify(userToVerify.Id, code);
            if (typeof response === 'string') // Error detected
                renderVerification(response);
            else {
                let verifiedCredentials = {
                    Email: userToVerify.Email,
                    Password: userToVerify.Password,
                    VerifyCode: "verified"
                }
                let connectedUser = await Accounts_API.Login(verifiedCredentials);
                sessionUser = connectedUser;
                await showPosts();
                changeMainTitle(`Bienvenue ${userToVerify.Name}!`, 'rgb(0, 87, 204)');
            }
        }
    });
    $('#verifyInput').on('keydown', function (e) {
        if (e.key === "Enter") $('input[type="submit"]').click();
    });
    $('#abort').on("click", async function () { await showPosts(); });
}
async function renderUserForm(user = null) {
    let create = user == null;
    if (create) user = newUser();
    hidePosts();
    changeMainTitle(create ? 'Inscription' : 'Modification');
    $("#form").show();
    $("#form").empty();
    $("#form").append(`
        <form class="form" id="userForm">
            <input type="hidden" name="Id" id="Id" value="${user.Id}"/>
            <input type="hidden" name="Created" id="Created" value="${user.Created}"/>

            <fieldset>
                <label for="Email" class="form-label">Adresse courriel</label>
                <input 
                    class="form-control Email"
                    name="Email"
                    id="Email"
                    placeholder="Courriel"
                    required
                    RequireMessage="Veuillez entrer un courriel"
                    CustomErrorMessage="Le courriel est déjà utilisé"
                    InvalidMessage="Le format du courriel est invalide"
                    value="${user.Email}"
                />
                <input 
                    class="form-control MatchedInput"
                    matchedInputId="Email"
                    name="ConfirmEmail"
                    id="ConfirmEmail"
                    placeholder="Vérification"
                    required
                    RequireMessage="Veuillez entrer un courriel"
                    InvalidMessage="Les courriels ne sont pas identiques"
                    value="${user.Email}"
                />
            </fieldset>

            <fieldset>
                <label for="Password" class="form-label">Mot de passe</label>
                <input
                    type="password"
                    class="form-control"
                    name="Password" 
                    id="Password" 
                    placeholder="Mot de passe"
                    required
                    RequireMessage="Veuillez entrer un mot de passe"
                    InvalidMessage="Le mot de passe requiert 6 caractères minium sans espaces"
                    value="${user.Password}"
                />
                <input
                    type="password"
                    class="form-control MatchedInput"
                    matchedInputId="Password"
                    name="ConfirmPassword" 
                    id="ConfirmPassword" 
                    placeholder="Vérification"
                    required
                    RequireMessage="Veuillez confirmer votre mot de passe"
                    InvalidMessage="Les mots de passes ne sont pas identiques"
                    value="${user.Password}"
                />
            </fieldset>

            <fieldset>
                <label for="Name" class="form-label">Nom</label>
                <input
                    class="form-control"
                    name="Name"
                    id="Name"
                    placeholder="Nom"
                    required
                    RequireMessage="Veuillez entrer un nom"
                    value="${user.Name}"
                />
            </fieldset>

            <fieldset>
                <label class="form-label">Avatar</label>
                <div class='imageUploaderContainer'>
                    <div class='imageUploader' 
                        newImage='${create}' 
                        controlId='Avatar' 
                        imageSrc='${user.Avatar}'
                        waitingImage="Loading_icon.gif">
                    </div>
                </div>
            </fieldset>

            <div id="optionsContainer">
                <input
                    type="submit" 
                    value="Enregistrer" 
                    id="saveUser" 
                    class="btn btn-primary"
                />
                <input
                    type="button"
                    value="Annuler"
                    id="cancel"
                    class="btn cancelUser"
                />`
        +
        (sessionUser ? `
                <hr/>
                <input
                    type="button"
                    value="Supprimer votre compte"
                    id="delete"
                    class="btn deleteUser"
                />` : ``
        )
        +
        `</div>
        </form>
    `);

    initImageUploaders();
    initFormValidation(); // important do to after all html injection!
    addConflictValidation(Accounts_API.CONFLICT_URL(), 'Email', 'submit');

    $('#userForm').on("submit", async function (event) {
        event.preventDefault();
        let user = getFormData($("#userForm"));
        delete user.ConfirmEmail;
        delete user.ConfirmPassword;
        if(user.Password === "************")
            user.Password = '';
        user = await Accounts_API.Save(user, create);
        if (!Posts_API.error) {
            if (create)
                await renderUserConnectForm(verifyMessage)
            else{
                sessionUser = user;
                await showPosts();
            }
        }
        else
            showError("Une erreur est survenue! ", Posts_API.currentHttpError);
    });
    $('#cancel').on("click", async function () {
        await showPosts();
    });
}
async function renderUserConnectForm(instructMsg = "") {
    hidePosts();
    $('#form').show();
    $('#form').empty();
    $('#abort').show();
    changeMainTitle('Connexion');
    $("#form").append(`
        <div id="instructions" style="display:${instructMsg ? "block" : "none"}">${instructMsg}</div>
        <form class="form" id="userForm">
            <input 
                class="form-control"
                name="Email"
                id="Email"
                placeholder="Courriel"
                RequireMessage="Veuillez entrer un courriel"
                InvalidMessage="Courriel introuvable"
                required
            />
            <input 
                class="form-control"
                name="Password" 
                id="Password" 
                placeholder="Mot de passe"
                type="password"
                required
                RequireMessage="Veuillez entrer un mot de passe"
                InvalidMessage="Mot de passe incorrecte"
            />

            <input type="submit" value="Entrer" id="connect" class="btn btn-primary">
            <input type="button" value="Nouveau compte" id="createNewAccount" class="btn btn-primary">
        </form>
    `);
    initFormValidation(); // important do to after all html injection!

    $('#userForm').on("submit", async function (event) {
        event.preventDefault();
        let user = getFormData($("#userForm"));
        let response = await Accounts_API.Login(user);
        if (!Accounts_API.error) {
            if (response.Authorizations) {
                sessionUser = response;
                await showPosts();
                initTimeout(TIMEOUT_TIME, logout);
                timeout();
            }
            else {
                userToVerify = { ...user, ...response };
                await renderVerification();
            }
        }
        else
            showError("Une erreur est survenue! ", Accounts_API.currentHttpError);
    });
    $('#createNewAccount').on("click", async function () {
        await renderUserForm();
    });
    $('#abort').on("click", async function () {
        await showPosts();
    });
}
//#endregion

//#region User Management
async function renderUsersList() {
    hidePosts();
    $('#form').show();
    $('#abort').show();
    changeMainTitle('Gestion des utilisateurs');
    let users = Accounts_API.Get();
    $("#form").append(`
        <div id="usersContainer">
            ${users.forEach(user => {
        `
                <div class="userRow">
                    <div><img class="avatarIcon" src="${user.Avatar}"/></div>
                    <div>${user.Name}</div>
                </div>
            `})}
        </div>
    `);
}
//#endregion

async function logout() {
    await Accounts_API.Logout(sessionUser.Id);
    if (!Accounts_API.error) {
        sessionUser = null;
        await renderUserConnectForm();
        noTimeout();
    }
    else
        showError("Une erreur est survenue! ", Accounts_API.currentHttpError);
}