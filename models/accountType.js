module.exports = function (sequelize, Sequelize) {
  const AccountType = sequelize.define('accountType', {

    id: {
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER,
    },

    accountType: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    versionNo: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

    deleteFl: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
    },

  }, {
    timestamps: false,
  });

  return AccountType;
};
