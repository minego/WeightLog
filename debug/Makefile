APPID=$(shell grep '"id"' appinfo.json | cut -d: -f2 | cut -d'"' -f2)

all: lint
	rm -rf tmp 2>/dev/null || true
	mkdir tmp
	cp -r ../app ../levels ../images ../index.html ../resources ../stylesheets ../icon.png ../sources.json tmp
	cp -r appinfo.json framework_config.json tmp
	palm-package tmp
	rm -rf tmp

install: all
	palm-install *.ipk

clean:
	rm *.ipk 2>/dev/null || true

launch: install
	palm-launch -i $(APPID)

log:
	-palm-log -f $(APPID) | sed -u										\
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
