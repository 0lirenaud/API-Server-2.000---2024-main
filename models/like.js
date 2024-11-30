import Model from './model.js';

export default class Like extends Model {
    constructor() {
        super();

        this.addField('UserId', 'integer');
        this.addField('PostId', 'integer');
    }
}