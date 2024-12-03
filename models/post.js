import Model from './model.js';
import Repository from './repository.js';
import UserModel from './user.js';

export default class Post extends Model {
    constructor() {
        super(true /* secured Id */);

        this.addField('Title', 'string');
        this.addField('Text', 'string');
        this.addField('Category', 'string');
        this.addField('Image', 'asset');
        this.addField('Date', 'integer');
        this.addField('Likes', 'array')
        this.addField('OwnerId', 'string');

        this.setKey("Title");
    }

    bindExtraData(instance) {
        instance = super.bindExtraData(instance);

        let usersRepository = new Repository(new UserModel());

        let ownerUser = usersRepository.get(instance.OwnerId);
        if (ownerUser) {
            instance.OwnerName = ownerUser.Name;
            instance.OwnerAvatar = ownerUser.Avatar;
        } else {
            instance.OwnerName = "Unknown";
            instance.OwnerAvatar = "";
        }

        instance.Likes.forEach((element, index) => {
            instance.Likes[index].UserName = usersRepository.get(element.UserId).Name;
        });

        return instance;
    }
    static removeLikes(userId) {
        let postRepository = new Repository(new Post())
        let posts = postRepository.getAll(null, true);
        let indexesToDelete = []

        //Post deletion part
        posts.forEach(post => {
            if(post.OwnerId == userId){
                indexesToDelete.push(post.Id);
            }
        });
        if(indexesToDelete.length > 0)
            indexesToDelete.forEach(idx => {
                postRepository.remove(idx);
            });

        //Post like part
        posts = postRepository.getAll(null, true);
        posts.forEach(post => {
            let likes = post.Likes;
            if (likes.length > 0) {
                let like = likes.find(u => u.UserId == userId);
                if (like) {
                    let idx = likes.indexOf(like);
                    likes.splice(idx, 1);
                    post.Likes = likes;
                    postRepository.update(post.Id, post);
                }
            }
        });
    }
}