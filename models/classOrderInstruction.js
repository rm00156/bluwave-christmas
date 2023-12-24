function ClassOrderInstructions(sequelize, Sequelize) {
  const ClassOrderInstruction = sequelize.define('classOrderInstruction', {

    id: {
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER,
    },

    classFk: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

    deadLineDttm: {
      type: Sequelize.DATE,
      allowNull: false,
    },

    pdfPath: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    createdDttm: {
      type: Sequelize.DATE,
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

  return ClassOrderInstruction;
}

module.exports = ClassOrderInstructions;
