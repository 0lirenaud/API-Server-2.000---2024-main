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
}