import Repository from '../models/repository.js';
import Controller from './Controller.js';
import LikeModel from '../models/registration.js';

export default class LikeController extends Controller {
    constructor(HttpContext) {
        super(HttpContext, new Repository(new LikeModel()));
    }
}