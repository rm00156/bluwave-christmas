function Statuses(sequelize, Sequelize) {
  const Status = sequelize.define('status', {

    id: {
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER,
    },

    statusTypeFk: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    createdDttm: {
      type: Sequelize.DATE,
      default: Date.now(),
    },
    schoolFk: {
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

  return Status;
}

module.exports = Statuses;
