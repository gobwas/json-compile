var compile = require("../src/compile"),
    path    = require("path"),
    expect  = require("chai").expect,
    _       = require("lodash");

describe("compile", function() {

    it("should compile json from path", function(done) {
        compile(path.resolve(__dirname, "./fixtures/personal/nick.json"), function(err, obj) {
            var error;

            if (err) {
                done(err);
                return;
            }

            try {
                expect(obj).to.be.an('object');
                expect(obj).to.have.property('nick', 'gobwas');
                expect(obj).to.have.property('name', 'Sergey');
                expect(obj).to.have.property('surname', 'Kamardin');
            } catch (err) {
                error = err;
            }

            done(error);
        });
    });

    it("should compile json from path and inner refs", function(done) {
        compile(path.resolve(__dirname, "./fixtures/personal/full.json"), function(err, obj) {
            var error;

            if (err) {
                done(err);
                return;
            }

            try {
                expect(obj).to.be.an('object');
                expect(obj).to.have.property('nick', 'gobwas');
                expect(obj).to.have.property('name', 'Sergey');
                expect(obj).to.have.property('location');
                expect(obj.location).to.have.property('planet', 'Earth');
                expect(obj.location).to.have.property('country', 'Russia');
            } catch (err) {
                error = err;
            }

            done(error);
        });
    });

});