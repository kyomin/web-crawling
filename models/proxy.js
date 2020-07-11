const { sequelize, Sequelize } = require(".");

module.exports = (sequelize, Sequelize) => {
    return sequelize.define('proxy', {
        ip: {
            type: Sequelize.STRING(30),
            allowNull: false,
        },
        protocol: {
            type: Sequelize.STRING(20),
            allowNull: false
        },
        latency: {
            type: Sequelize.FLOAT.UNSIGNED,
            allowNull: false
        }
    });
}