module.exports = function (sequelize, Sequelize) {
  const Email = sequelize.define('email', {

    id: {
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER,
    },

    emailTypeFk: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

    sentDttm: {
      type: Sequelize.DATE,
      allowNull: false,
    },

    status: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    accountFk: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    deleteFl: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    versionNo: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },

  }, {
    timestamps: false,
  });

  return Email;
};
