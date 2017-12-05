'use strict';

var signUrl = require('sign-url');
var crypto = require('crypto');

module.exports.register = function (server, options, next) {
    server.ext({
        type: 'onRequest',
        method: function (request, reply) {
            const url = `${request.headers['x-forwarded-proto'] || request.connection.info.protocol}://${request.info.host}${request.url.path}`;
            var httpInfo = {
                method  : request.method,
                path    : request.url.pathname,
                url     : url,
                remote  : request.info.remoteAddress,
                agent   : request.headers['user-agent']
            };
            console.log(httpInfo);
            if(process.env.NODE_ENV == 'development') {
                return reply.continue();
            }
            if(httpInfo.path == '/sessions'){
                return reply.continue();
            }

            var timestamp = request.query.expiry || 0;
            if (timestamp > (Date.now() + 30000) || timestamp < (Date.now() - 30000)) {
                httpInfo['msg'] = '请求已过期';
                errorLogger.error(httpInfo);
                return reply('请求已过期');
            }

            var confirm = request.query.confirm;
            if(confirm == 'ios'){
                var md5 = crypto.createHash('md5');
                var str = 'hapi-plugIn' + timestamp;
                var sign = md5.update(str).digest('base64');
                var signature = request.query.signature;
                if(!sign == signature){
                    errorLogger.error(httpInfo);
                    return reply('签名验证失败');
                }
                return reply.continue();
            }

            // http://my.superproject.io?confirm=username@somewhere.com&expiry=1392305771282&signature=SrO0X9p27LHFIe7xITBOpetZSpM%3D
            if (!signUrl.check(url, confirm)) {
                httpInfo['msg'] = '签名验证失败';
                errorLogger.error(httpInfo);
                return reply('签名验证失败');
            }
            return reply.continue();
        }
    });
    next();
}
module.exports.register.attributes = {
    name: 'SignFilter',
    version: '0.0.1'
};