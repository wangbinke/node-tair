NAME = tair
SRC = $(shell find lib -type f -name "*.js")
TESTS = test/*.test.js
TESTTIMEOUT = 6000
REPORTER = spec
VERSION = $(shell date +%Y%m%d%H%M%S)
SVNURL = $(shell svn info | grep URL | awk '{print $$2}')
PKGS_SVN = $(shell dirname `dirname $(SVNURL)`)/npm/pkgs

test:
	@NODE_ENV=test mocha \
		--reporter $(REPORTER) --timeout $(TESTTIMEOUT) $(TESTS)

test-cov-json: lib-cov
	@mv lib lib-bak
	@mv lib-cov lib
	@JSCOV=1 $(MAKE) test REPORTER=json-cov > coverage.html
	@mv lib lib-cov
	@mv lib-bak lib
	@rm -rf lib-cov

test-cov: lib-cov
	@mv lib lib-bak
	@mv lib-cov lib
	@JSCOV=1 $(MAKE) test REPORTER=html-cov > coverage.html
	@mv lib lib-cov
	@mv lib-bak lib
	@rm -rf lib-cov

lib-cov: clean
	@jscoverage lib lib-cov

clean:
	@rm -rf *-cov
	@rm -f coverage.html

.PHONY: test test-cov lib-cov clean test-cov-json
