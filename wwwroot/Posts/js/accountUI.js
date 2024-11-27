//#region User form rendering
function newUser() {
    let User = {};
    User.Id = "";
    User.Name = "";
    User.Email = "";
    User.Password = "";
    User.Avatar = "";
    // User.Created après le submit
    // User.Authorizations après le submit
    // User.VerifyCode après le submit
    return User;
}

function renderUserForm(user = null){
    let create = user == null;
    if (create) user = newUser();
    $("#form").show();
    $("#form").empty();
    $("#form").append(`
        <form class="form" id="userForm">
            <input type="hidden" name="Id" value="${user.Id}"/>
            <input type="hidden" name="Created" value="${user.Created}"/>
            <label for="Email" class="form-label">Adresse courriel</label>
            <input 
                class="form-control"
                name="Email"
                id="Email"
                placeholder="Courriel"
                required
                value="${user.Email}"
            />
            <input 
                class="form-control"
                name="ConfirmEmail"
                id="ConfirmEmail"
                placeholder="Vérification"
                required
                value="${user.Email}"
            />
            <label for="Password" class="form-label">Titre </label>
            <input 
                class="form-control"
                name="Title" 
                id="Title" 
                placeholder="Titre"
                required
                RequireMessage="Veuillez entrer un titre"
                InvalidMessage="Le titre comporte un caractère illégal"
                value="${post.Title}"
            />
            <label for="Url" class="form-label">Texte</label>
            <textarea class="form-control" 
                        name="Text" 
                        id="Text"
                        placeholder="Texte" 
                        rows="9"
                        required 
                        RequireMessage = 'Veuillez entrer une Description'>${post.Text}</textarea>

            <label class="form-label">Image </label>
            <div class='imageUploaderContainer'>
                <div class='imageUploader' 
                    newImage='${create}' 
                    controlId='Image' 
                    imageSrc='${post.Image}' 
                    waitingImage="Loading_icon.gif">
                </div>
            </div>
            <div id="keepDateControl">
                <input type="checkbox" name="keepDate" id="keepDate" class="checkbox" checked>
                <label for="keepDate"> Conserver la date de création </label>
            </div>
            <input type="submit" value="Enregistrer" id="savePost" class="btn btn-primary displayNone">
        </form>
    `);
    if (create) $("#keepDateControl").hide();

    initImageUploaders();
    initFormValidation(); // important do to after all html injection!

    $("#commit").click(function () {
        $("#commit").off();
        return $('#savePost').trigger("click");
    });
    $('#postForm').on("submit", async function (event) {
        event.preventDefault();
        let post = getFormData($("#postForm"));
        if (post.Category != selectedCategory)
            selectedCategory = "";
        if (create || !('keepDate' in post))
            post.Date = Local_to_UTC(Date.now());
        delete post.keepDate;
        post = await Posts_API.Save(post, create);
        if (!Posts_API.error) {
            await showPosts();
            postsPanel.scrollToElem(post.Id);
        }
        else
            showError("Une erreur est survenue! ", Posts_API.currentHttpError);
    });
    $('#cancel').on("click", async function () {
        await showPosts();
    });
}

async function renderUserConnectForm() {
    showForm();
    $("#form").show();
    $("#form").empty();
    $("#form").append(`
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
    $('#cancel').on("click", async function () {
        await showPosts();
    });
}
//#endregion