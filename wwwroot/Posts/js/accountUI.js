//#region User form rendering
let verifyMessage = `Votre compte a été crée. Veuillez
                vérifier vos courriels, afin de récupérer votre code de vérification
                pour votre prochaine connexion. Merci !`

function changeMainTitle(msg = 'Fil de nouvelles'){
    $('#viewTitle').text(msg)
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

async function renderUserForm(user = null) {
    let create = user == null;
    if (create) user = newUser();
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
                    class="form-control"
                    name="Email"
                    id="Email"
                    placeholder="Courriel"
                    required
                    RequireMessage="Veuillez entrer un courriel"
                    CustomErrorMessage="Les courriels ne sont pas identiques"
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
                    CustomErrorMessage="Les courriels ne sont pas identiques"
                    InvalidMessage="Le format du courriel est invalide"
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
                    CustomErrorMessage="Les mots de passes ne sont pas identiques"
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
                    InvalidMessage="Le mot de passe requiert 6 caractères minium sans espaces"
                    CustomErrorMessage="Les mots de passes ne sont pas identiques"
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
                        controlId='Image' 
                        imageSrc='${user.Avatar}' 
                        waitingImage="Loading_icon.gif">
                    </div>
                </div>
            </fieldset>

            <div>
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
                />
            </div>
        </form>
    `);

    initImageUploaders();
    initFormValidation(); // important do to after all html injection!
    addConflictValidation(Accounts_API.API_URL(),'Email','submit');
    $('#userForm').on("submit", async function (event) {
        event.preventDefault();
        let user = getFormData($("#userForm"));
        user = await Accounts_API.Save(user, create);
        if (!Posts_API.error) {
            if(create)
                await renderUserConnectForm(verifyMessage)
            else
                await showPosts();
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
        user = await Accounts_API.Login(user);
        if (!Accounts_API.error) {
            sessionUser = user.User;
            await showPosts();
        }
        else
            showError("Une erreur est survenue! ", Accounts_API.currentHttpError);
    });
    $('#createNewAccount').on("click", async function () {
        await renderUserForm();
    });
    $('#cancel').on("click", async function () {
        await showPosts();
    });
}
//#endregion