module.exports = (sequelize, Sequelize) => {
    return sequelize.define('instagram', {
        postId: {
            type: Sequelize.STRING(100),
            allowNull: false,
            unique: true
        },
        image: {
            type: Sequelize.TEXT,
            allowNull: true
        }
    });
}