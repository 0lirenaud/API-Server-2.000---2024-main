
class Accounts_API {
    static API_URL() { return "http://localhost:5000/accounts" };
    static setSessionUser(user) {
        sessionStorage.setItem('user', JSON.stringify(user));
    }
    static setAccessToken(token) {
        sessionStorage.setItem('access_Token', token);
    }
    static removeSessionUser() {
        sessionStorage.removeItem('user');
    }
    static removeAccessToken() {
        sessionStorage.removeItem('access_Token');
    }
    static headerAccessToken() {
        return {"authorization": "Bearer " + sessionStorage.getItem('access_Token')}
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
    static async HEAD() {
        Posts_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: this.API_URL(),
                type: 'HEAD',
                contentType: 'text/plain',
                complete: data => { resolve(data.getResponseHeader('ETag')); },
                error: (xhr) => { Posts_API.setHttpErrorState(xhr); resolve(null); }
            });
        });
    }
    static async Get(id = null) {
        Accounts_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: this.API_URL() + (id != null ? "/index/" + id : ""),
                headers: this.headerAccessToken,
                complete: data => { resolve({ ETag: data.getResponseHeader('ETag'), data: data.responseJSON }); },
                error: (xhr) => { Accounts_API.setHttpErrorState(xhr); resolve(null); }
            });
        });
    }
    static async Login(data) {
        Accounts_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: 'http://localhost:5000/token',
                type: "POST",
                dataType: "json",
                contentType: 'application/json',
                data: JSON.stringify(data),
                success: (data) => { resolve(data); this.setSessionUser(data.User); this.setAccessToken(data.Access_token) },
                error: (xhr) => { Accounts_API.setHttpErrorState(xhr); resolve(null); }
            })
        });
    }
    static async Logout(id) {
        Accounts_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: this.API_URL() + '/logout',
                data: {userId: id},
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
                url: create ? this.API_URL() : this.API_URL() + "/" + data.Id,
                type: create ? "POST" : "PUT",
                contentType: 'application/json',
                data: JSON.stringify(data),
                headers: this.headerAccessToken,
                success: (data) => { resolve(data); },
                error: (xhr) => { Posts_API.setHttpErrorState(xhr); resolve(null); }
            });
        });
    }
}