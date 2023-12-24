function Schools(sequelize, Sequelize) {
  const School = sequelize.define('school', {

    id: {
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER,
    },

    email: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
    },

    schoolNumber: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
    },

    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    address: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    postCode: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    number: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    additionalInfo: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    numberOfKidsPerClass: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

    organiserAccountFk: {
      type: Sequelize.INTEGER,
      allowNull: false,
      unique: true,
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

  return School;
}

module.exports = Schools;
