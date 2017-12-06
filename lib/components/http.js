'use strict';

/**
 * Module requirement
 */
let path = require('path');
let fs = require('fs');
let assert = require('assert');

let Hapi = require('hapi');
let Chalk = require('chalk');

let apiBuilder = require('../apibuilder');

module.exports = function (app, opts) {
    return new Http(app, opts);
};

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 8080;
const DEFAULT_ROOT = 'app/servers';

const formatLogEvent = function (event) {
    if (event.tags.error) {
        console.log(`[${event.tags}], ${Chalk.red(event.data)}`);
    } else {
        console.log(`[${event.tags}], ${Chalk.green(event.data)}`);
    }
};

let Http = function (app, opts) {
    opts = opts || {};

    this.app = app;
    this.httpServer = new Hapi.Server();
    this.plugins = [];

    // self.logger.info('Http opts:', opts);
    this.port = opts.port || DEFAULT_PORT;

    this.httpServer.on('log', formatLogEvent);

    this.httpServer.connection({
        port: opts.port || DEFAULT_PORT,
        //host: opts.host || DEFAULT_HOST
    })

    if (process.env.NODE_ENV == "development") {
        this.plugins = this.plugins.concat([
            require('inert'),
            require('vision'),
            {
                'register': require('hapi-swagger'),
                'options': {
                    info: {
                        'title': 'Hapi API Documentation',
                        'version': require('../../package').version,
                    },
                    debug: true
                }
            }
        ]);
    }

    this.server = null;
};


Http.prototype.loadRoutes = function () {
    let routesPath = path.join(this.app.getBase(), 'app/servers', this.app.getServerType(), 'routes');
    // self.logger.info(routesPath);
    assert.ok(fs.existsSync(routesPath), 'Cannot find route path: ' + routesPath);

    let self = this;
    fs.readdirSync(routesPath).forEach(function (file) {
        if (/.js$/.test(file)) {
            let routeFile = path.join(routesPath, file);
            let route = require(routeFile)(self.app);
            // self.logger.info(routeFile);
            var api = apiBuilder(
                route.Schema,
                route.info.name.toLowerCase()+'s',
                route.info.name,
                route.info.name.toLowerCase(),
                route.Options
            );

            self.httpServer.route(api.routes);
        }
    });
};

Http.prototype.loadFilters = function () {
    let filtersPath = path.join(this.app.getBase(), 'app/servers', this.app.getServerType(), 'filters');
    // self.logger.info(filtersPath);
    assert.ok(fs.existsSync(filtersPath), 'Cannot find filter path: ' + filtersPath);

    let filters = [];
    fs.readdirSync(filtersPath).forEach(function (file) {
        if (/.js$/.test(file)) {
            let filterFile = path.join(filtersPath, file);
            // self.logger.info(routeFile);
            filters = filters.concat(require(filterFile));
        }
    });

    this.plugins = this.plugins.concat(filters);
};


Http.prototype.start = function (cb) {
    let self = this;

    this.loadRoutes();
    this.loadFilters();

    this.httpServer.on('start', (route) => {
        cb();
        console.log('Server started');
    });

    console.log(this.plugins);
    this.httpServer.register(this.plugins, (err) => {
        if(err) {
            throw err; // something bad happened loading the plugin
        }
        self.httpServer.start((err) => {
            if(err) {
                throw err;
            }
            self.httpServer.log('info', 'Server running at: ' + self.httpServer.info.uri);
        });
    });
}


Http.prototype.stop = function (force, cb) {
    this.httpServer.stop(force ? {timeout : 0} : {timeout: 5 * 1000});
    this.httpServer.on('stop', (route) => {
        cb();
        console.log('Server stopped');
    });
}
