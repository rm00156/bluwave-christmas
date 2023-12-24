function Kids(sequelize, Sequelize) {
  const Kid = sequelize.define('kid', {

    id: {
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER,
    },

    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    age: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    month: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

    classFk: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },

    parentAccountFk: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    code: {
      type: Sequelize.STRING,
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

  return Kid;
}

module.exports = Kids;
