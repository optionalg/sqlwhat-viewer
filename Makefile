DIR_FRONTEND=app/static

build_antlr:
	antlr4 -Dlanguage=JavaScript $(DIR_FRONTEND)/grammar/plsql.g4

build_js:
	cd $(DIR_FRONTEND) && npm install && node_modules/.bin/webpack
