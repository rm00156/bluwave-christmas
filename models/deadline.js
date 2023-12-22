function Deadlines(sequelize, Sequelize) {
  const DeadLine = sequelize.define('deadLine', {

    id: {
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER,
    },

    schoolFk: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

    deadLineDttm: {
      type: Sequelize.DATE,
      allowNull: false,
    },

    emailSentFl: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defualt: false,
    },

    emailSentDttm: {
      type: Sequelize.DATE,
      allowNull: true,
    },

    continueFl: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
    },

    delayFl: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
    },

    verificationCode: {
      type: Sequelize.STRING,
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

  return DeadLine;
}

module.exports = Deadlines;
