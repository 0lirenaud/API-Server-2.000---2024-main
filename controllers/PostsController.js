import PostModel from '../models/post.js';
import Repository from '../models/repository.js';
import Controller from './Controller.js';

export default class PostModelsController extends Controller {
    constructor(HttpContext) {
        super(HttpContext, new Repository(new PostModel()));
    }

    togglelike(data) {
        if(this.repository != null) {
            let post = this.repository.get(data.postId, true);
            if(post != null) {
                let removed = false;
                post.Likes.forEach((element, index) => {
                    if(element.UserId == data.userId){
                        post.Likes.splice(index, 1);
                        removed = true;
                        return;
                    }
                });
                if(!removed)
                    post.Likes.push({'UserId': data.userId});
                
                let updatedPost = this.repository.update(post.Id, post);
                updatedPost = this.repository.get(post.Id);
                if (this.repository.model.state.isValid)
                    this.HttpContext.response.JSON(updatedPost);
                else
                    this.HttpContext.response.badRequest(this.repository.model.state.error);
            }
            else
                this.HttpContext.response.unprocessable();
        }
        else
            this.HttpContext.response.notImplemented();
    }
}