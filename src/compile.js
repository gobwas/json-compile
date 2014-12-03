var fs      = require("fs"),
    pointer = require("json-pointer"),
    path    = require("path");

function isObject(obj) {
    return Object.prototype.toString.call(obj) === "[object Object]";
}

function isArray(obj) {
    return Object.prototype.toString.call(obj) === "[object Array]";
}

function isString(obj) {
    return Object.prototype.toString.call(obj) === "[object String]";
}

function isFunction(obj) {
    return Object.prototype.toString.call(obj) === "[object Function]";
}

function isReference(key) {
    return isString(key) && (/^.*\$ref$/i).test(key);
}

function parseReference(reference) {
    var index, response;

    response = {
        inner: null,
        outer: null
    };

    if ((index = reference.indexOf("#")) != -1) {
        response.inner = reference.substring(index + 1);
        response.outer = reference.substring(0, index);
    } else {
        response.outer = reference;
    }

    return response;
}

function noop(){}

function extend(obj) {
    var extensions, extension, i, key, value, existingValue, customize;

    extensions = Array.prototype.slice.call(arguments, 1);

    if (!isFunction(extensions[extensions.length - 1])) {
        customize = function(a, b) {
            return b;
        }
    } else {
        customize = extensions.pop();
    }

    for (i = 0; i < extensions.length; i++) {
        extension = extensions[i];

        for (key in extension) if (extension.hasOwnProperty(key)) {
            obj[key] = customize(obj[key], extension[key]);
        }
    }

    return obj;
};

function _each(obj, iterator) {
    var key, value;

    if (isArray(obj)) {
        if (obj.forEach) {
            obj.forEach(iterator);
        } else {
            for (key = 0; key < obj.length; key++) {
                iterator(obj[key], key);
            }
        }
    } else {
        for (key in obj) {
            if (obj.hasOwnProperty(key)) {
                value = obj[key];
                iterator(value, key);
            }
        }
    }
}

function _keys(obj) {
    var keys;

    if (isObject(obj) && Object.keys) {
        return Object.keys(obj);
    }

    keys = [];

    _each(obj, function(value, key) {
        keys.push(key);
    });

    return keys;
}

function each(obj, iterator, done) {
    var remain;

    remain = _keys(obj).length;

    if (!remain) done();

    _each(obj, function(value, key) {
        try {
            iterator(value, key, function(err) {
                if (err) {
                    done(err);
                    done = noop;
                    return;
                }

                if (--remain === 0) {
                    done();
                }
            });
        } catch (err) {
            done(err);
            done = noop;
        }
    });
}

function group(obj, grouper, done) {
    var result;

    result = {};

    each(obj,
        function(value, key, next) {
            grouper(value, key, function(err, group) {
                var key, val;

                if (err) {
                    next(err);
                    return;
                }

                if (isObject(group)) {
                    key = group.group;
                    val = group.value;
                } else if (isString(group)) {
                    key = group;
                    val = value;
                }

                (key && value) && (result[key] || (result[key] = [])).push(val);

                next();
            });
        },
        function(err) {
            if (err) {
                done(err);
                return;
            }

            done(null, result);
        }
    );
}

function walker(options) {
    var customize;

    customize = function deep(a, b) {
        return ( options.merge && isObject(a) && isObject(b) ) ? extend({}, a, b, deep) : b;
    };
    
    return function walk(obj, resolver, done, root, result) {
        result = result || {};
        root = root || obj;

        group(obj,
            function(value, key, next) {
                var parsed;

                if (isObject(value)) {
                    walk(value, resolver, function(err, obj) {
                        if (err) {
                            next(err);
                            return;
                        }

                        result[key] = obj;
                        next();
                    }, root);
                    return;
                }

                if (isReference(key)) {
                    parsed = parseReference(value);

                    next(null, {
                        group: parsed.outer ? "outer" : "inner",
                        value: function(done) {
                            resolver(value, root, function(err, obj) {
                                var extension;

                                if (err) {
                                    done(err);
                                    return;
                                }

                                // construction `extend({}, obj, result)` brings us functionality
                                // to add JUST non-existing properties
                                extension = extend({}, obj, result, customize);

                                extend(result, extension);
                                
                                done();
                            });
                        }
                    });
                    return;
                }

                result[key] = value;
                next();
            },
            function(err, refs) {
                if (err) {
                    done(err);
                    return;
                }

                each(refs.outer,
                    function(rslv, key, next) {
                        rslv(next);
                    },
                    function(err) {
                        if (err) {
                            done(err);
                            return;
                        }

                        each(refs.inner,
                            function(rslv, key, next) {
                                rslv(next);
                            },
                            function(err) {
                                if (err) {
                                    done(err);
                                    return;
                                }

                                done(null, result);
                            }
                        );
                    }
                );
            }
        );
    };
}

function fsLoader(file, done) {
    fs.readFile(file, done);
}

function compile(file, options, done) {
    var basedir, loader, filepath, fileDir;

    if (isFunction(options)) {
        done = options;
        options = undefined;
    }

    options = extend({
        basedir: path.dirname(file),
        loader:  fsLoader,
        merge:   true
    }, options || {});

    basedir = options.basedir;
    loader  = options.loader;

    filepath = path.resolve(basedir, file);
    fileDir = path.dirname(filepath);

    loader(path.resolve(basedir, file), function(err, contents) {
        var json;

        if (err) {
            done(err);
            return;
        }

        try {
            json = JSON.parse(contents);
        } catch (err) {
            done(err);
            return;
        }

        walker(options)(json,
            function(reference, json, done) {
                var parsed;

                parsed = parseReference(reference);

                if (parsed.outer) {
                    compile(parsed.outer, extend({}, options, { basedir: fileDir }), function(err, json) {
                        if (err) {
                            done(err);
                            return;
                        }

                        if (parsed.inner) {
                            done(null, pointer(json, parsed.inner));
                            return;
                        }

                        done(null, json);
                    });

                    return;
                }

                if (parsed.inner) {
                    done(null, pointer(json, parsed.inner));
                    return;
                }

                done(null, null);
            },
            done
        );
    });
}

module.exports = compile;