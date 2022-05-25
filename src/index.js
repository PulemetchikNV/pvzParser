const {sequelize, Product, Address, Company} = require('../conn.js')
const { v4: uuidv4 } = require('uuid');
var cron = require('node-cron');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
var xl = require('excel4node');
cron.schedule('1 7 * * *', async() => {
    await getActualData()
});
cron.schedule('5 7 * * *', async() => {
    await sendToPvz()
    await sendToCompanies()
    await sendToDriver()
});
async function sendToCompanies(){
    await sequelize.sync()
    var comps = await Company.findAll()
    var addrs = await Address.findAll()

    for(let comp of comps){
        
        var key = comp.dataValues.uuid
        await fetch(`http://193.107.239.228:1090/sendTo?message=Адреса за ${new Date().toLocaleDateString()}(Компания ${comp.dataValues.name})&key=${key}`)
        for(let addr of addrs){
            var data = `${addr.dataValues.address}:%0A`
            let prods = await Product.findAll({
                where: {AddressId: addr.dataValues.id, CompanyId: comp.dataValues.id,delievered_toFF: 0}
            })
            for(let prod of prods){
                data += `${prod.dataValues.article}- ${prod.dataValues.reciever} - ${prod.dataValues.code}(${prod.dataValues.count}шт.)%0A`
            }
            if(prods.length > 0){
                await fetch(`http://193.107.239.228:1090/sendTo?message=${data}&key=${key}`)
            }
        }
    }
}
async function sendToPvz(){
    await sequelize.sync()
    var addrs = await Address.findAll()
    for(let addr of addrs){
        var key = addr.dataValues.uuid
        var data = `${addr.dataValues.address}:%0A%0A`
        let prods = await Product.findAll({
            where: {AddressId: addr.dataValues.id,delievered_toFF: 0}
        })
        for(let prod of prods){
            data += `${prod.dataValues.reciever} - ${prod.dataValues.code}(${prod.dataValues.count}шт.)%0A`
        }
        if(prods.length > 0){
            await fetch(`http://193.107.239.228:1090/sendTo?message=${data}&key=${key}`)
        }
    }
}
async function sendToDriver (){
    await sequelize.sync()
    let key = '34dc01e7-b027-4328-a638-58371079e18c'
    var addrs = await Address.findAll()
    await fetch(`http://193.107.239.228:1090/sendTo?message=Адреса за ${new Date().toLocaleDateString()}&key=${key}`)
    for(let addr of addrs){
        var data = `${addr.dataValues.address}:%0A%0A`
        let prods = await Product.findAll({
            where: {AddressId: addr.dataValues.id, delievered_toFF: 0}
        })
        for(let prod of prods){
            data += `${prod.dataValues.reciever} - ${prod.dataValues.code}(${prod.dataValues.count}шт.)%0A`
            prod.delievered_toFF = 1
            await prod.save();
        }
        if(prods.length > 0){
            await fetch(`http://193.107.239.228:1090/sendTo?message=${data}&key=${key}`)
        }
    }
}

async function getActualData(){
    await sequelize.sync()
    await getShev(auth1, 'freeedom')
    await getShev(auth2, 'alter')
    await getShev(auth3, 'foster')
    await getMpBoost('All')
    // console.log(data);
    console.log('===FINISH===');
}
//freeedom
const auth1 = {
    password: 'nx2RQaiw',
    username: '+79274301678'
}
//alter 
const auth2 = {
    password: 'XhJHt6fy',
    username: '+79953656775'
}
//foster
const auth3 = {
    "password": "ItW5Xn9n",
    "username": "+79631188888"
}
const companies = {
    Viner: 'alter',
    Renata: 'foster',
    Renata2: 'lanbena',
    Intim: 'freeedom'
}
async function getMpBoost(){
    var data = []
    var offset = 0
    var total = 10000000
    while(offset < total){
        const dlvrsUrl = `https://gateway.mpboost.pro/api/v1/deliveries?status=delivered&limit=60&offset=${offset}`
        const options = {
            headers: {
                'x-api-key': "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2NjYzNDg5ODUsInN1YiI6MTUzNjV9.vIe9fMV0tPP_y_bN9NTCk1QwMgLVKfQwLH97GuBRIMw"
            }
        }
        var delieveries = await fetch(dlvrsUrl, options)
        delieveries = await delieveries.json()
        // var dn = new Date().getDate()
        for(let delievery of delieveries[`items`]){
            var reciever = delievery[`account`][`first_name`] + ` ` +delievery[`account`][`last_name`]
            var code = delievery[`account`][`private_code`]
            var address = delievery[`address`][`value`]
            
            var d = new Date((delievery[`delivered_at`] + '444')*1).toLocaleDateString()
            var products = delievery[`products`]
            for(let p of products){

                var article = p[`article_id`]
                var company = p[`name`].split(' /')[0].toLowerCase()
                var productCount = p[`quantity`]
                try{
                    var addr = await Address.create({
                        address,
                        uuid: uuidv4()
                    })
                }catch{
                    var addr = await Address.findOne({
                        where: {address}
                    })
                }
                var comp = await Company.findOne({
                        where: {name: company}
                    })


                var prod = await Product.findOne({
                    where: {code, reciever,delievered_at: d, delievered_toFF: 0}
                })
                if(prod == null){
                    prod = await Product.create({
                        code,
                        reciever,
                        article,
                        delievered_at: d,
                        raw_json: JSON.stringify(delievery),
                        count: productCount,
                        delievered_toFF: false
                    })
                    addr.addProduct(prod)
                    comp.addProduct(prod)
                    await sequelize.sync()
                }
            }
        }
        total = delieveries[`total`]
        offset += 60
    }
    return data
}
async function getShev(data,company){
    let token = await shevAuth(data)
    let url = `https://buyouts-shop.ru:8443/api/v1/orders/delivery-orders/?status=is_ready&limit=1000&page=1`
    let options = {
        headers: {
            Authorization: `Bearer ${token}`
        }
    }
    var data = []
    var delieveries = await fetch(url, options)
    console.log(delieveries);
    delieveries = await delieveries.json()
    var results = delieveries[`results`]
    console.log(results);
    if(results == undefined) return []
    for(let result of results){
        var reciever = result[`full_name`]
        var code = result[`private_code`]
        var address = result[`address`]
        var productCount = result[`products`].length
        var products = result[`products`]
        for(let p of products){
            await sequelize.sync()
            var article = p[`article`]
            try{
                var addr = await Address.create({
                    address,
                    uuid: uuidv4()
                })
            }catch{
                var addr = await Address.findOne({
                    where: {address}
                })
            }
            var comp = await Company.findOne({
                    where: {name: company}
                })


            var prod = await Product.findOne({
                where: {code, reciever, delievered_toFF: 0}
            })
            if(prod == null){
                prod = await Product.create({
                    code,
                    reciever,
                    article,
                    delievered_at: ' ',
                    raw_json: JSON.stringify(result),
                    count: productCount,
                    delievered_toFF: false
                })
                addr.addProduct(prod)
                comp.addProduct(prod)
                await sequelize.sync()
            }
        }
        
    }

    return data
}
async function shevAuth(data){
    let url = `https://buyouts-shop.ru:8443/api/v1/token/`
    let options = {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
            'Content-Type' : 'application/json'
        }
    }
    let token = await fetch(url, options)
    token = await token.json()
    var tkn = token[`access`]
    return tkn
}

async function updAddress(){
    var offset = 0
    var total = 10000000
    while(offset < total){
        const dlvrsUrl = `https://gateway.mpboost.pro/api/v1/deliveries?status=completed&limit=60&offset=${offset}`
        const options = {
            headers: {
                'x-api-key': "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2NjYzNDg5ODUsInN1YiI6MTUzNjV9.vIe9fMV0tPP_y_bN9NTCk1QwMgLVKfQwLH97GuBRIMw"
            }
        }
        var delieveries = await fetch(dlvrsUrl, options)
        delieveries = await delieveries.json()
        // var dn = new Date().getDate()
        for(let delievery of delieveries[`items`]){
            var address = delievery[`address`][`value`]
            try{
                var addr = await Address.create({
                    address,
                    uuid: uuidv4()
                })
            }catch{
                var addr = await Address.findOne({
                    where: {address}
                })
            }
            await sequelize.sync()
        }
        total = delieveries[`total`]
        offset += 60
    }
    let tokens = [await shevAuth(auth1),  await shevAuth(auth2), await shevAuth(auth3)]
    for(let token of tokens){
        let url = `https://buyouts-shop.ru:8443/api/v1/orders/delivery-orders/?status=is_ready&limit=1000&page=1`
        let options = {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
        var delieveries = await fetch(url, options)
        delieveries = await delieveries.json()
        var results = delieveries[`results`]
        if(results == undefined) continue
        for(let result of results){
            var address = result[`address`]
            try{
                var addr = await Address.create({
                    address,
                    uuid: uuidv4()
                })
            }catch{
                var addr = await Address.findOne({
                    where: {address}
                })
            }   
            await sequelize.sync()
        }
    }
}

async function formExcel(){
    var wb = new xl.Workbook();
    var ws = wb.addWorksheet('Адреса');
    ws.cell(1, 1).string('Адрес')
    ws.cell(1, 2).string('uuid')
    ws.cell(1, 3).string('Группа')
    var addrs = await Address.findAll()
    for(let i = 2; i < addrs.length + 2; i++){
        var j = i - 2
        ws.cell(i, 1).string(`${addrs[j].dataValues.address}`)
        ws.cell(i, 2).string(`${addrs[j].dataValues.uuid}`)
    }
    wb.write('Адреса.xlsx');
}
async function getExcel(){

}