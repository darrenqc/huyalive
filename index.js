'use strict'

const fs = require('fs'),
util = require('util'),
moment = require('moment'),
logger = require('winston');

logger.cli();

function Spider() {
    this.name = 'huyalive';
}

Spider.prototype = {
    onInit:function(done) {
		this.resultDir = './result/';
		this.resultFile = util.format('huyalive.%s.csv', moment().format('YYYY-MM-DD'));
		if(!fs.existsSync(this.resultDir)){
		    fs.mkdirSync(this.resultDir);
		}
        let channels = [
            {
                name:'网游竞技',
                channelNo:100023
            },
            {
                name:'单机游戏',
                channelNo:100002
            },
            {
                name:'娱乐综艺',
                channelNo:100022
            },
            {
                name:'手游休闲',
                channelNo:100004
            }
        ];
        this.seed = [];
        channels.forEach(function(channel){
            this.seed.push({
                opt:{
                    uri:'http://www.huya.com/index.php',
                    qs:{
                        m:'Game',
                        do:'ajaxGameLiveByPage',
                        gid:channel.channelNo,
                        page:1,
                        pageNum:1
                    },
                    params:{
                        channel:channel
                    }
                },
                next:'getList'
            });
        }, this);
		fs.writeFileSync(this.resultDir+this.resultFile, '\ufeff频道,tag,roomName,owner,观看人数\n');
        done();
    },
    onData:function(dataSet) {
		if(dataSet.get('data')) {
		    fs.appendFileSync(this.resultDir+this.resultFile, dataSet.get('data'));
		}
    },
    getList:function(ctx, done) {
    	let channel = ctx.params.channel;
    	delete ctx.params.channel;
    	let page = ctx.params.page;

    	let data = null;
    	try {
    		data = JSON.parse(ctx.content);
    	} catch(e) {
    		logger.error('[Channel %s, page %s] get list json parse failed: %s', channel.name, page, e);
    		done();
    		return;
    	}

    	let items = [];

        data.data.list.forEach(function(item){
            items.push([
                    channel.name,
                    item.gameFullName,
                    item.roomName.replace(/,/g, ''),
                    item.nick.replace(/,/g, ''),
                    item.totalCount
                ].join());
        });

    	logger.info('[Channel %s, page %s] got %s live shows', channel.name, page, items.length);

    	if(items.length) {
    		ctx.dataSet.set('data', items.join('\n')+'\n');
    		ctx.params.page += 1;
            ctx.tasks.push({
                opt:{
                    uri:'http://www.huya.com/index.php',
                    qs:ctx.params,
                    params:{
                        channel:channel
                    }
                },
                next:'getList'
            })
    	}

    	done();
    }
}

const Flowesh = require('flowesh'),
charsetparser = require('mof-charsetparser'),
iconv = require('mof-iconv'),
cheerio = require('mof-cheerio'),
normalizer = require('mof-normalizer'),
reqadapter = require('mof-reqadapter');

const env = 'development';
const config = require('./config.json')[env];

const flowesh = new Flowesh(config).attach(new Spider());

flowesh.requestmw.use(normalizer());
flowesh.requestmw.use(reqadapter());

flowesh.responsemw.use(charsetparser());
flowesh.responsemw.use(iconv());
flowesh.responsemw.use(cheerio());

flowesh.start();