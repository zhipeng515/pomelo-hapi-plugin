'use strict';

const Joi = require('joi');

module.exports = function (app, opts) {
    return new UserRoute(app, opts);
};

let UserRoute = function(app, opts){
    this.app = app;
    opts = opts || {};

    this.info = {
        name: 'User',
        version: '0.0.1'
    };
    this.Schema = {
        nickname    : { type: String, required: true, trim: true, joi: Joi.string() },
        gender      : { type: String, required: true, trim: true, joi: Joi.string() },
        phone       : { type: String, required: false, trim: true, joi: Joi.string() },
        sns         : { type: String, required: true, trim: true, joi: Joi.string() },
        userid      : { type: String, required: true, unique: true, trim: true, joi: Joi.string() },
        avatar      : { type: String, required: true, trim: true, joi: Joi.string() },
        gold        : { type: Number, required: false, joi: Joi.number() },
        gem         : { type: Number, required: false, joi: Joi.number() },
        rand        : { type: Number, index: true, /*default: Math.random(),*/ joi: Joi.number() },
    }
    this.Options = {
        routes: {
            getAll: {
                disable: true
            },
            getOne: {
                disable: false,
            },
            update: {
                disable: true
            },
            create: {
                disable: false
            },
            remove: {
                disable: true
            }
        },
        controllers: {
            getOne: {
                handler: function (request, reply) {
                }
            },
            create: {
                handler: function (request, reply) {
                }
            }
        }
    }
}
