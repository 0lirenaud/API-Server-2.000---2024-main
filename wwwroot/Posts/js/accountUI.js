const TIMEOUT_TIME = 1800
const USER_READONLY_HTML = { title: 'Usager Régulier', logo: '<i class="fa-solid fa-user mx-2"></i>' };
const SUPER_USER_HTML = { title: 'Super Usager', logo: '<i class="fa-solid fa-user-pen"></i>' };
const ADMIN_HTML = { title: 'Administrateur', logo: '<i class="fa-solid fa-user-shield"></i>' };
const USER_BLOCKED_HTML = { desc: 'Bloquer ', state: '<i class="fa-solid fa-check" style="color: #00ff00;"></i>' };
const USER_UNBLOCKED_HTML = { desc: 'Débloquer ', state: '<i class="fa fa-ban" style="color: #ff0000;"></i>' };
const TYPES = [USER_READONLY_HTML, SUPER_USER_HTML, ADMIN_HTML];
let sessionUser = sessionStorage.getItem('user') == 'undefined' ? null : JSON.parse(sessionStorage.getItem('user'));
let verifyMessage = `
    Votre compte a été crée. Veuillez
    vérifier vos courriers, afin de récupérer votre code de vérification
    pour votre prochaine connexion. Merci !`
let changedEmailMessage = `
    Suite à votre changement de courriel, veuillez récupérer le nouveau code
    de vérification dans vos courriers pour poursuivre votre connexion. Merci !`
var userToVerify;
if (sessionUser != null) {
    initTimeout(TIMEOUT_TIME, logout);
    timeout();
}

//#region User form rendering
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
        if (user.Password === "************")
            user.Password = '';
        user = await Accounts_API.Save(user, create);
        if (!Posts_API.error) {
            if (user === 'unverified') {
                sessionUser = null;
                await renderUserConnectForm(changedEmailMessage);
            }
            else if (create)
                await renderUserConnectForm(verifyMessage)
            else {
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
    if (sessionUser)
        $('#delete').on('click', function () {
            confirmDelete(sessionUser.Id)
        });
}
async function renderUserConnectForm(instructMsg = "", color='black') {
    hidePosts();
    $('#hiddenIcon2').show();
    $('#form').show();
    $('#form').empty();
    $('#abort').show();
    changeMainTitle('Connexion');
    $("#form").append(`
        <div id="instructions" style="display:${instructMsg ? "block" : "none"}; color: ${color}">${instructMsg}</div>
        <form class="form loginForm" id="userForm">
            <div>
                <input 
                    class="form-control Email"
                    name="Email"
                    id="Email"
                    placeholder="Courriel"
                    RequireMessage="Veuillez entrer un courriel"
                    InvalidMessage="Le format du courriel est invalide"
                    required
                />
                <span class="errorMessage" id="emailError"></span>
            </div>
            <div>
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
                <span class="errorMessage" id="passwordError"></span>
            </div>

            <input type="submit" value="Entrer" id="connect" class="btn btn-primary">
            <hr />
            <input type="button" value="Nouveau compte" id="createNewAccount" class="btn btn-info">
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
        else {
            if (Accounts_API.currentStatus == 482)
                $('#passwordError').text('Mot de passe incorrect');
            else if (Accounts_API.currentStatus == 481)
                $('#emailError').text('Courriel introuvable');
            else if (Accounts_API.currentStatus == 401)
                $('#passwordError').text(Accounts_API.currentHttpError);
            else
                $('#passwordError').text(Accounts_API.error);
        }
    });
    $('#createNewAccount').on("click", async function () {
        await renderUserForm();
    });
    $('#abort').on("click", async function () {
        await showPosts();
    });
    $('input').on('keydown', function () {
        $('.errorMessage').each(function () {
            $(this).text('');
        });
    });
}
//#endregion

//#region User Management
function userListeners() {
    $(".promoteUser").off();
    $(".promoteUser").on('click', async function () {
        let $this = $(this);
        let id = $this.parent().data('id');
        let title = $this.attr('title');
        await toggleType($this, title, id);
    });
    $(".deleteAccount").off()
    $(".deleteAccount").on('click', function () {
        let id = $(this).parent().data('id');
        confirmDelete(id, true);
    });
    $('.blockUser').off();
    $('.blockUser').on('click', async function () {
        let $this = $(this);
        let id = $this.parent().data('id');
        let title = $this.attr('title');
        await toggleBlocked($this, title, id);
    });
}
function userTypeLogo(u) {
    return u.isAdmin ? ADMIN_HTML : u.isSuperUser ? SUPER_USER_HTML : USER_READONLY_HTML;
}
function userBlockedLogo(u) {
    return u.isBlocked ? USER_UNBLOCKED_HTML : USER_BLOCKED_HTML;
}
function userRegularOptions(u) {
    const { desc, state } = userBlockedLogo(u);
    return (!u.isAdmin) ? `
    <div title="${desc + u.Name}" class="blockUser">${state}</div>
    <div title="${'Supprimer ' + u.Name}"class="deleteAccount"><i class="fa-solid fa-circle-xmark"></i></div>
    ` : ``
}
function confirmDelete(id, adminRequest = false) {
    bootbox.confirm({
        message: `Voulez-vous vraiment supprimer ${adminRequest ? "cet utilisateur" : "votre compte"}?`,
        buttons: {
            confirm: {
                label: 'Oui',
                className: 'btn-success'
            },
            cancel: {
                label: 'Non',
                className: 'btn-danger'
            }
        },
        callback: async function (result) {
            if (result) {
                if (await deleteUser(id, adminRequest))
                    if (adminRequest) { await renderUsersList(); } else { await logout(); }
                else changeMainTitle(Accounts_API.error, 'red'); // Debugging purposes
            }
        }
    });
}

async function deleteUser(id, adminRequest) {
    let deleted = await Accounts_API.Delete(id, adminRequest);
    return typeof deleted != 'string';
}
async function toggleType($this, title, id) {
    let u = await Accounts_API.Promote(id);
    let index = TYPES.findIndex(type => type.title === title);
    index = (index == TYPES.length - 1) ? 0 : index + 1;
    $this.attr('title', TYPES[index].title);
    $this.html(TYPES[index].logo);
    if ($this.siblings().length > 0)
        $this.siblings().remove();
    $this.after(userRegularOptions(u))
    userListeners()
}
async function toggleBlocked($this, title, id) {
    let u = await Accounts_API.Block(id);
    if(u.isBlocked)
        $this.prev('.promoteUser').remove();
    else
        $this.closest('.options').prepend(`<div title="${USER_READONLY_HTML.title}" class="promoteUser">${USER_READONLY_HTML.logo}</div>`);
    $this.attr('title', title.includes(USER_BLOCKED_HTML.desc) ? USER_UNBLOCKED_HTML.desc : USER_BLOCKED_HTML.desc);
    $this.html(title.includes(USER_BLOCKED_HTML.desc) ? USER_UNBLOCKED_HTML.state : USER_BLOCKED_HTML.state);
    userListeners();
}
async function renderUsersList() {
    hidePosts();
    $('#hiddenIcon2').show();
    $('#form').show();
    $('#form').empty();
    $('#abort').show();
    changeMainTitle('Gestion des usagers');
    let users = (await Accounts_API.Get())
        .data
        .sort((a, b) => { return a.Name.localeCompare(b.Name); })
        .filter(u => u.Id !== sessionUser.Id);

    $("#form").append(`
        <div id="usersContainer">
            ${users.map(user => {
        const { title, logo } = userTypeLogo(user);
        const regularUserChoices = userRegularOptions(user);
        const promoteUserIcon = user.isBlocked ? `` : `<div title="${title}" class="promoteUser">${logo}</div>`;
        return `<div class="userRow">
                    <div class="userInfo">
                        <div><img class="userIconMenu" src="${user.Avatar}" /></div>
                        <div class="postUserName">${user.Name}</div>
                    </div>
                    <div class="options" data-id="${user.Id}">
                        ${promoteUserIcon}`
            +
            regularUserChoices
            +
            `</div>
                </div>`}).join('')}
        </div>
    `);
    userListeners();
}
//#endregion

async function logout() {
    await Accounts_API.Logout(sessionUser.Id);
    if (!Accounts_API.error) {
        sessionUser = null;
        await renderUserConnectForm('Votre session est expirée. Veuillez vous reconnecter', 'red');
        noTimeout();
    }
    else
        showError("Une erreur est survenue! ", Accounts_API.currentHttpError);
}