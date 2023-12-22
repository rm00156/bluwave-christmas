function StatusTypes(sequelize, Sequelize) {
  const StatusType = sequelize.define('statusType', {

    id: {
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER,
    },

    type: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    nextTypeFk: {
      type: Sequelize.INTEGER,
      allowNull: true,
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

  return StatusType;
}

module.exports = StatusTypes;
