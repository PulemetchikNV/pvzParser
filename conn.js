const { Sequelize,DataTypes} = require('sequelize');

// const mysql = require('mysql2')

// const conn = mysql.createConnection({
//     host: '127.0.0.1',
//     user: "root",
//     database: "adressBot",
//     password: "password",
//     // socketPath : '/run/mysqld/mysqld.sock'
// })
const sequelize = new Sequelize('adressBot', 'phpmyadmin', 'password', {
    host: '127.0.0.1',
    dialect: 'mysql'
})
const Product = sequelize.define('Product', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    code: {
        type: DataTypes.INTEGER
    },
    reciever: {
        type: DataTypes.STRING
    },
    article: {
        type: DataTypes.STRING
    },
    delievered_at: {
        type: DataTypes.STRING
    },
    raw_json: {
        type: DataTypes.JSON
    },
    count: {
        type: DataTypes.INTEGER
    },
    delievered_toFF: {
        type: DataTypes.TINYINT
    }
})
const Address = sequelize.define('Address', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    address: {
        type: DataTypes.STRING,
        unique: true
    },
    uuid: {
        type: DataTypes.STRING
    },
    group: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
})
const Company = sequelize.define('Company', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING
    },
    uuid: {
        type: DataTypes.STRING
    }
})

Address.hasMany(Product)
Company.hasMany(Product)
module.exports = {sequelize, Product, Address, Company}