NAME = tair
SRC = $(shell find lib -type f -name "*.js")
TESTS = test/*.test.js
TESTTIMEOUT = 6000
REPORTER = dot
VERSION = $(shell date +%Y%m%d%H%M%S)
SVNURL = $(shell svn info | grep URL | awk '{print $$2}')
PKGS_SVN = $(shell dirname `dirname $(SVNURL)`)/npm/pkgs

test:
	@NODE_ENV=test ./node_modules/mocha/bin/mocha \
		--reporter $(REPORTER) --timeout $(TESTTIMEOUT) $(TESTS)

test-cov-json: lib-cov
	@JSCOV=1 $(MAKE) test REPORTER=json-cov

test-cov: lib-cov
	@JSCOV=1 $(MAKE) test REPORTER=html-cov > coverage.html

lib-cov: clean
	@jscoverage lib lib-cov
	@jscoverage proxy proxy-cov

clean:
	@rm -rf *-cov
	@rm -f coverage.html

.PHONY: test test-cov lib-cov clean test-cov-json