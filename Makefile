beta:
	rm -rf .active 2>/dev/null || true
	ln -s beta .active

debug:
	rm -rf .active 2>/dev/null || true
	ln -s debug .active

release:
	rm -rf .active 2>/dev/null || true
	ln -s release .active

appinfo:
	svn info | grep "Last Changed Rev" | sed 's/.*: *//' | sed 's/\(.*\)\([0-9][0-9]\)/s\/autoversion\/1.\1.\2\//' > .version
	cat .active/appinfo.json | sed -f .version > appinfo.json

all: lint appinfo
	rm -rf .tmp 2>/dev/null || true
	mkdir .tmp
	cp -r app images index.html resources stylesheets icon.png sources.json .tmp
	cp -r appinfo.json .active/framework_config.json .tmp || true
	cp .active/minego-app.js .tmp/app/model/ ||true
	palm-package --use-v1-format .tmp
	rm -rf .tmp

install: all
	palm-install *.ipk

clean:
	rm *.ipk 2>/dev/null || true
	rm -rf .tmp 2>/dev/null || true

appid:
	grep '"id"' .active/appinfo.json | cut -d: -f2 | cut -d'"' -f2 > .active/appid

launch: install appid
	palm-launch -i `cat .active/appid`

log: appid
	-palm-log -f `cat .active/appid` | sed -u							\
		-e 's/\[[0-9]*-[0-9]*:[0-9]*:[0-9]*\.[0-9]*\] [a-zA-Z]*: //'	\
		-e 's/indicated new content, but not active./\n\n\n/'

lint:
	cat ../sources.json				| \
		grep "source"				| \
		sed 's/.*\"source\"://'		| \
		cut -d'"' -f2				| \
		xargs -L1 -I{} jsl -nologo -nofilelisting -nosummary -nocontext -conf ../jsl.conf -process ../{}

test: launch log
	true

.PHONY: beta debug release clean

