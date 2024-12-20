
class Accounts_API {
    static HOST() { return "http://localhost:5000/" };
    static API_URL() { return this.HOST() + "accounts" };
    static REGISTER_URL() { return this.API_URL() + "/register" };
    static MODIFY_URL() { return this.API_URL() + "/modify" };
    static CONFLICT_URL() { return this.API_URL() + "/conflict" };
    static VERIFY_URL() { return this.API_URL() + "/verify?" };
    static PROMOTE_URL() { return this.API_URL() + "/promote" };
    static BLOCK_URL() { return this.API_URL() + "/block" };
    static DELETE_URL() { return this.API_URL() + "/remove/" };

    static setSessionUser(user) {
        sessionStorage.setItem('user', JSON.stringify(user));
    }
    static getSessionUser() {
        return JSON.parse(sessionStorage.getItem('user'));
    }
    static setAccessToken(token) {
        sessionStorage.setItem('access_Token', token);
    }
    static getAccessToken() {
        return sessionStorage.getItem('access_Token');
    }
    static removeSessionUser() {
        sessionStorage.removeItem('user');
    }
    static removeAccessToken() {
        sessionStorage.removeItem('access_Token');
    }
    static headerAccessToken() {
        return { "authorization": "Bearer " + sessionStorage.getItem('access_Token') }
    }

    static initHttpState() {
        this.currentHttpError = "";
        this.currentStatus = 0;
        this.error = false;
    }
    static setHttpErrorState(xhr) {
        if (xhr.responseJSON)
            this.currentHttpError = xhr.responseJSON.error_description;
        else
            this.currentHttpError = xhr.statusText == 'error' ? "Service introuvable" : xhr.statusText;
        this.currentStatus = xhr.status;
        this.error = true;
    }
    static async Get(id = null) {
        Accounts_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: this.API_URL() + (id != null ? "/index/" + id : ""),
                headers: this.headerAccessToken(),
                complete: data => { resolve({ ETag: data.getResponseHeader('ETag'), data: data.responseJSON }); },
                error: (xhr) => { Accounts_API.setHttpErrorState(xhr); resolve(null); }
            });
        });
    }
    static async Login(credentials) {
        Accounts_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: 'http://localhost:5000/token',
                type: "POST",
                dataType: "json",
                contentType: 'application/json',
                data: JSON.stringify(credentials),
                headers: this.headerAccessToken(),
                success: (data) => {
                    if (data.User.VerifyCode === "verified" || credentials.VerifyCode === "verified") {
                        this.setAccessToken(data.Access_token);
                        this.setSessionUser(data.User);
                        resolve(data.User);
                    } else {
                        let infos = { Id: data.User.Id, Name: data.User.Name };
                        resolve(infos);
                    }
                },
                error: (xhr) => { Accounts_API.setHttpErrorState(xhr); resolve(null); }
            })
        });
    }
    static async Logout(id) {
        Accounts_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: this.API_URL() + '/logout',
                data: { userId: id },
                headers: this.headerAccessToken(),
                complete: (data) => {
                    this.removeSessionUser();
                    this.removeAccessToken();
                    resolve(true);
                },
                error: (xhr) => { Accounts_API.setHttpErrorState(xhr); resolve(null); }
            })
        });
    }
    static async Save(data, create = true) {
        Accounts_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: create ? this.REGISTER_URL() : this.MODIFY_URL(),
                type: create ? "POST" : "PUT",
                contentType: 'application/json',
                data: JSON.stringify(data),
                headers: this.headerAccessToken(),
                success: (data) => {
                    let onlineUser = this.getSessionUser();
                    if (onlineUser) {
                        if (data.Email != onlineUser.Email) {
                            this.Logout(onlineUser.Id);
                            resolve('unverified')
                        } else {
                            this.setSessionUser(data);
                            resolve(data);
                        }
                    } else {
                        resolve(data);
                    }
                },
                error: (xhr) => { Posts_API.setHttpErrorState(xhr); resolve(null); }
            });
        });
    }
    static async Verify(id, code) {
        Accounts_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: this.VERIFY_URL() + `id=${id}&code=${code}`,
                success: data => { resolve(data); },
                headers: this.headerAccessToken(),
                error: (xhr) => {
                    Accounts_API.setHttpErrorState(xhr);
                    if (this.currentStatus == 480) resolve(`Le code entré est invalide pour cet utilisateur. Veuillez réessayer.`);
                    else if (this.currentStatus == 422) resolve(`Utilisateur introuvable.`);
                    else if (this.currentStatus == 501) resolve(`Une erreur est survenue avec le serveur.`);
                    else resolve(`Requête introuvable`)
                }
            });
        });
    }
    static async Promote(id) {
        Accounts_API.initHttpState();
        let user = (await this.Get(id)).data;
        return new Promise(resolve => {
            $.ajax({
                url: this.PROMOTE_URL(),
                type: "POST",
                dataType: "json",
                contentType: 'application/json',
                data: JSON.stringify(user),
                headers: this.headerAccessToken(),
                success: data => { resolve(data); },
                error: (xhr) => {
                    Accounts_API.setHttpErrorState(xhr);
                    resolve(null);
                }
            });
        });
    }
    static async Block(id) {
        Accounts_API.initHttpState();
        let user = (await this.Get(id)).data;
        return new Promise(resolve => {
            $.ajax({
                url: this.BLOCK_URL(),
                type: "POST",
                dataType: "json",
                contentType: 'application/json',
                data: JSON.stringify(user),
                headers: this.headerAccessToken(),
                success: data => { resolve(data); },
                error: (xhr) => {
                    Accounts_API.setHttpErrorState(xhr);
                    resolve(null);
                }
            });
        });
    }
    static async Delete(id, adminRequest) {
        Accounts_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: this.DELETE_URL() + id,
                data: { userToRemove: id, requestByAdmin: adminRequest },
                headers: this.headerAccessToken(),
                success: (data) => {resolve(data)},
                error: (xhr) => { Posts_API.setHttpErrorState(xhr); resolve('Opération annulée'); }
            });
        });
    }
}