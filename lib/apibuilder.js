'use strict';

var Joi = require('joi');
var assert = require('power-assert');
var _ = require('lodash');

var modelNameForAssert = '';

function apiBuilder(schemaDefination, routeBaseName, modelName, singularRouteName, options) {

    assert(schemaDefination, 'Schema Defination is required');
    assert(routeBaseName, 'Route Base Name is required');
    assert(modelName, 'Model Name is required');
    assert(singularRouteName, 'Singular Model\'s Route Name is required');

    modelNameForAssert = modelName;

    var validations = buildValidationObject(schemaDefination);
    var responses = buildControllersResponses(validations.put, validations.join, options);
    var controllers = buildControllers(validations, responses, singularRouteName, options);
    var routes = buildRoutes(controllers, routeBaseName, singularRouteName, options);

    return {
        validations: {
            post: validations.post,
            put: validations.put,
        },
        controllers: controllers,
        routes: routes,
        responses: responses
    }
}

function buildValidationObject(config) {
    var post = {}, put = {};
    var join = [];
    var schema = Object.assign({}, config);
    for (var prop in schema) {
        var itemConf = schema[prop];
        if (itemConf === null) {
            throw new Error('Null configs are not supported!');
        }
        if (itemConf.joi) {
            if (!itemConf.joi.isJoi) {
                itemConf.joi = Joi.object(itemConf.joi);
            }
            put[prop] = itemConf.joi;
            if (itemConf.required) {
                post[prop] = itemConf.joi.required()
            } else {
                post[prop] = itemConf.joi;
            }

            delete schema[prop].joi;
        }
        if(itemConf.join) {
            join.push(itemConf.join);
            delete schema[prop].join;
        }
    }
    return {
        schema: schema,
        join: join,
        post: post,
        put: put,
    }
}

function optionTypeof(option, type) {
    if(type instanceof Array) {
        for(var t in type) {
            if(typeof option == type[t])
                return true;
        }
        return false;
    } else if (typeof option != type) {
        return false;
    }
    return true;
}

function getOptions(from, method, type, item, options) {
    if (options == undefined)
        return null;

    if (eval('options.' + from) == undefined)
        return null;
    if (eval('options.' + from + '.' + method) == undefined)
        return null;
    var result = eval('options.' + from + '.' + method + '.' + item);
    var resultCheck = optionTypeof(result, type);
    if (result != undefined) {
        assert(resultCheck,
            modelNameForAssert + ' ' + from + ' ' + method + ' ' + item + '(' + result + ')' + ' must be a ' + type);
    }
    return resultCheck ? result : null;
}

function getControllerHandlerFromOptions(method, options) {
    return getOptions('controllers', method, 'function', 'handler', options);
}

function getControllerValidateFromOptions(method, options) {
    return getOptions('controllers', method, 'object', 'validate', options);
}

function getControllerResponseFromOptions(method, options) {
    return getOptions('controllers', method, 'object', 'response', options);
}

function getRouteDescriptionFromOptions(method, options) {
    return getOptions('routes', method, 'string', 'description', options);
}

function getRouteNotesFromOptions(method, options) {
    return getOptions('routes', method, 'string', 'notes', options);
}

function getRouteDisableFromOptions(method, options) {
    return getOptions('routes', method, 'boolean', 'disable', options);
}

function getRouteAuthFromOptions(method, options) {
    return getOptions('routes', method, ['string', 'object', 'boolean'], 'auth', options);
}

function getControllerSchemaFilterFromOptions(method, options) {
    return getOptions('controllers', method, 'object', 'filter', options);
}

function getControllerSchemaConditionFromOptions(method, options) {
    return getOptions('controllers', method, 'function', 'condition', options);
}

function getControllerSchemaSortFromOptions(method, options) {
    return getOptions('controllers', method, 'function', 'sort', options);
}

function buildControllers(joiValidationObject, responses, singularRouteName, options) {
    var defaultHandler = {
        getAll: function (request, reply) {
            assert(false, modelNameForAssert + 'getAll no implment');
        },
        getOne: function (request, reply) {
            assert(false, modelNameForAssert + 'getOne no implment');
        },
        create: function (request, reply) {
            assert(false, modelNameForAssert + 'create no implment');
        },
        update: function (request, reply) {
            assert(false, modelNameForAssert + 'update no implment');
        },
        remove: function (request, reply) {
            assert(false, modelNameForAssert + 'remove no implment');
        }
    }
    var controllers = {
        getAll: {
            validate: getControllerValidateFromOptions('getAll', options) || {
                query: {
                    lastId: Joi.string().description('The last id, from lastest ' + singularRouteName + ' with an unspecified value'),
                    pageSize: Joi.number().integer().min(1).max(100).default(20).description('The number of ' + singularRouteName + ' per pages(1-100), default value is 20')
                }
            },
            response: getControllerResponseFromOptions('getAll', options) || {
                sample: 50,
                schema: Joi.array().items(responses.getAll.response)
            },
            handler: getControllerHandlerFromOptions('getAll', options) || defaultHandler.getAll
        },
        getOne: {
            validate: getControllerValidateFromOptions('getOne', options) || {
                params: {
                    id: Joi.string().required()
                }
            },
            response: getControllerResponseFromOptions('getOne', options) || {
                schema: responses.getOne.response
            },
            handler: getControllerHandlerFromOptions('getOne', options) || defaultHandler.getOne
        },
        create: {
            validate: getControllerValidateFromOptions('create', options) || {
                payload: joiValidationObject.post
            },
            response: getControllerResponseFromOptions('create', options) || {
                schema: responses.create.response
            },
            handler: getControllerHandlerFromOptions('create', options) || defaultHandler.create
        },
        update: {
            validate: getControllerValidateFromOptions('update', options) || {
                params: {
                    id: Joi.string().required()
                },
                payload: joiValidationObject.put
            },
            response: getControllerResponseFromOptions('update', options) || {
                schema: responses.update.response
            },
            handler: getControllerHandlerFromOptions('update', options) || defaultHandler.update
        },
        remove: {
            validate: getControllerValidateFromOptions('remove', options) || {
                params: {
                    id: Joi.string().required()
                }
            },
            response: getControllerResponseFromOptions('remove', options) || {
//                schema: responses.remove.response
            },
            handler: getControllerHandlerFromOptions('remove', options) || defaultHandler.remove
        }
    }
    return controllers;
}


function buildRoutes(controllers, routeBaseName, singularRouteName, options) {
    var routes = [];
    if (!getRouteDisableFromOptions('getAll', options)) {
        routes.push({
            method: 'GET',
            path: '/' + routeBaseName,
            config: {
                validate: controllers.getAll.validate,
                response: controllers.getAll.response,
                description: getRouteDescriptionFromOptions('getAll', options) || 'Get all ' + routeBaseName + '',
                notes: getRouteNotesFromOptions('getAll', options) || 'Returns a list of ' + routeBaseName + ' ordered by addition date',
                auth: getRouteAuthFromOptions('getAll', options) || false,
                tags: ['api', routeBaseName],
            },
            handler: controllers.getAll.handler
        });
    }
    if (!getRouteDisableFromOptions('getOne', options)) {
        routes.push({
            method: 'GET',
            path: '/' + routeBaseName + '/{id}',
            config: {
                validate: controllers.getOne.validate,
                response: controllers.getOne.response,
                description: getRouteDescriptionFromOptions('getOne', options) || 'Get ' + singularRouteName + ' by DB Id',
                notes: getRouteNotesFromOptions('getOne', options) || 'Returns the ' + singularRouteName + ' object if matched with the DB id',
                auth: getRouteAuthFromOptions('getOne', options) || false,
                tags: ['api', routeBaseName],
            },
            handler: controllers.getOne.handler
        });
    }
    if (!getRouteDisableFromOptions('update', options)) {
        routes.push({
            method: 'PUT',
            path: '/' + routeBaseName + '/{id}',
            config: {
                validate: controllers.update.validate,
                response: controllers.update.response,
                description: getRouteDescriptionFromOptions('update', options) || 'Update a ' + singularRouteName,
                notes: getRouteNotesFromOptions('update', options) || 'Returns a ' + singularRouteName + ' by the id passed in the path',
                auth: getRouteAuthFromOptions('update', options) || false,
                tags: ['api', routeBaseName],
            },
            handler: controllers.update.handler
        });
    }
    if (!getRouteDisableFromOptions('remove', options)) {
        routes.push({
            method: 'DELETE',
            path: '/' + routeBaseName + '/{id}',
            config: {
                validate: controllers.remove.validate,
                response: controllers.remove.response,
                description: getRouteDescriptionFromOptions('remove', options) || 'Delete ' + singularRouteName,
                notes: getRouteNotesFromOptions('remove', options) || 'Returns the ' + singularRouteName + ' deletion status',
                auth: getRouteAuthFromOptions('remove', options) || false,
                tags: ['api', routeBaseName],
            },
            handler: controllers.remove.handler
        });
    }
    if (!getRouteDisableFromOptions('create', options)) {
        routes.push({
            method: 'POST',
            path: '/' + routeBaseName,
            config: {
                validate: controllers.create.validate,
                response: controllers.create.response,
                description: getRouteDescriptionFromOptions('create', options) || 'Add a ' + singularRouteName,
                notes: getRouteNotesFromOptions('create', options) || 'Returns a ' + singularRouteName + ' by the id passed in the path',
                auth: getRouteAuthFromOptions('create', options) || false,
                tags: ['api', routeBaseName],
            },
            handler: controllers.create.handler
        });
    }
    return routes;
}

function getNewFilter(filter, optionsFilter) {
    if (optionsFilter == null || optionsFilter == undefined)
        return filter;
    var newFilter = '';
    filter.trim().split(' ').forEach(function (value) {
        if (_.startsWith(value, '-')) {
            value = _.trimStart(value, '-');
        }
        if (optionsFilter[value] != undefined) {
            if (optionsFilter[value]) {
                newFilter += ' ' + value;
            } else if (value == '_id') {
                newFilter += ' -' + value;
            }
        } else {
            newFilter += ' ' + value;
        }
    });
    return newFilter;
}

function buildResponseValidation(definitionObjectJoi, definitionJoin, filter) {
    var response = {};
    filter.trim().split(' ').forEach(function (value) {
        if (value == '_id') {
            response[value] = Joi.string().regex(/^[0-9a-fA-F]{24}$/);
        } else if (value == 'id') {
            response[value] = Joi.string();
        } else if (!_.startsWith(value, '-')) {
            response[value] = definitionObjectJoi[value];
        }
    });
    if(definitionJoin instanceof Array){
        for (var index in definitionJoin) {
            var populate = definitionJoin[index];
            response[populate.path] = Joi.array().items(Joi.object());
        }
    }

    return response;
}

function defaultSchemaFilter(definitionObject) {
    var defaultFilter = '';
    for (var prop in definitionObject) {
        defaultFilter += ' ' + prop;
    }
    return defaultFilter;
}

function buildControllersResponses(definitionObject, definitionJoin, options) {
    var defaultFilter = defaultSchemaFilter(definitionObject);
    var getAllFilter = getNewFilter(defaultFilter, getControllerSchemaFilterFromOptions('getAll', options));
    var getOneFilter = getNewFilter(defaultFilter, getControllerSchemaFilterFromOptions('getOne', options));
    var createFilter = getNewFilter(defaultFilter, getControllerSchemaFilterFromOptions('create', options));
    var updateFilter = getNewFilter(defaultFilter, getControllerSchemaFilterFromOptions('update', options));
//    var removeFilter = getNewFilter(defaultFilter, getControllerSchemaFilterFromOptions('remove', options));

    var defaultCondition = function (request) {
        return null;
    }
    var defaultSort = function (request) {
        return null;
    }

    var controllersResponses = {
        getAll: {
            filter: getAllFilter,
            condition: getControllerSchemaConditionFromOptions('getAll', options) || defaultCondition,
            response: buildResponseValidation(definitionObject, definitionJoin, getAllFilter),
            sort: getControllerSchemaSortFromOptions('getAll', options) || defaultSort,
        },
        getOne: {
            filter: getOneFilter,
            condition: getControllerSchemaConditionFromOptions('getOne', options) || defaultCondition,
            response: buildResponseValidation(definitionObject, definitionJoin, getOneFilter)
        },
        create: {
            filter: createFilter,
            condition: getControllerSchemaConditionFromOptions('create', options) || defaultCondition,
            response: buildResponseValidation(definitionObject, definitionJoin, createFilter)
        },
        update: {
            filter: updateFilter,
            condition: getControllerSchemaConditionFromOptions('update', options) || defaultCondition,
            response: buildResponseValidation(definitionObject, definitionJoin, updateFilter)
        },
        remove: {
            filter: assert(getControllerSchemaFilterFromOptions('remove', options) == null,
                modelNameForAssert + ' controllers remove filter unsupport customized'),
            condition: getControllerSchemaConditionFromOptions('remove', options) || defaultCondition,
            response: {}
            // filter: 'unsupport',
            // condition: 'unsupport',
            // response: 'unsupport'
            // filter: removeFilter,
            // condition: getControllerSchemaConditionFromOptions('remove', options) || defaultCondition,
            // response: buildResponseValidation(definitionObject, removeFilter)
        }
    }

    return controllersResponses;
}

function getErrorMessageFrom(err) {
    var errorMessage = '';

    if (err.errors) {
        for (var prop in err.errors) {
            if (err.errors.hasOwnProperty(prop)) {
                errorMessage += err.errors[prop].message + ' '
            }
        }

    } else {
        errorMessage = err.message;
    }

    return errorMessage;
}

String.prototype.toObjectId = function () {
    var ObjectId = (mongoose.Types.ObjectId);
    return new ObjectId(this.toString());
};

module.exports = apiBuilder;
