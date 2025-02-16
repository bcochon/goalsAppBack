require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, {logging : false});

const Partidos = sequelize.define('partidos', {
    fecha : {
        type : DataTypes.DATEONLY,
        unique : true,
        primaryKey : true,
    },
    lugar : DataTypes.STRING,
    descripcion : DataTypes.TEXT,
})
const Jugadores = sequelize.define('jugadores', {
    nombre : {
        type : DataTypes.STRING,
        allowNull : false,
        unique : true,
        primaryKey: true,
    },
    nacimiento : DataTypes.DATEONLY,
    caracteristica : DataTypes.STRING,
    curiosidad : DataTypes.TEXT,
})
const Goles_x_partidos = sequelize.define('goles_x_partidos', {
    goles : {
        type : DataTypes.INTEGER,
        defaultValue : 0,
    },
})

Jugadores.belongsToMany(Partidos, { through: Goles_x_partidos });
Partidos.belongsToMany(Jugadores, { through: Goles_x_partidos });

async function loadDataBase(options) {
    console.log('Sincronizando base de datos...');
    try {
        await sequelize.sync(options);
    } catch(e) {
        console.error(`Error al sincronizar la base de datos:`, e);
        return 1;
    }
    console.log(`Sincronizada la base de datos`);
    return 0;
}

async function resetDataBase() {
    return await loadDataBase({ force: true });
}

async function syncDataBase() {
    return await loadDataBase({ alter: true });
}

function createDate(day, month, year) {
    return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

async function writeData(table, entry) {
    try {
        if(!table) {
            console.error(`Operación writeData falló. No existe la tabla solicitada`);
            return;
        }
        return await table.create(entry);
    } catch (e) {
        if (e.name === 'SequelizeUniqueConstraintError') {
            console.error(`Operación writeData falló. La entrada ya existe en la tabla solicitada`);
            return;
        }
        console.error('Error en la operación writeData:', e);
        return;
    }
}

async function removeData(table, parameter) {
    try {
        if(!table) {
            console.error(`Operación removeData falló. No existe la tabla solicitada`);
            return;
        }
        const affectedRows = await table.destroy({ where: parameter });
        return affectedRows;
    } catch (e) {
        console.error('Error en la operación readData:', e);
    }
}

async function readData(table, parameter) {
    try {
        if(!table) {
            console.error(`Operación readData falló. No existe la tabla solicitada`);
            return;
        }
        const data = await table.findOne({ where: parameter });
        if(data)
            return data;
        return undefined;
    } catch (e) {
        console.error('Error en la operación readData:', e);
    }
}

async function readArrayFromData(table, parameter) {
    try {
        if(!table) {
            console.error(`Operación readArrayFromData falló. No existe la tabla solicitada`);
            return;
        }
        const data = await table.findAll({ where: parameter });
        if(data)
            return data;
        return undefined;
    } catch (e) {
        console.error('Error en la operación readArrayFromData:', e);
    }
}

async function getRowValues(table, row) {
    try {
        if(!table) {
            console.error(`Operación readArrayFromData falló. No existe la tabla solicitada`);
            return;
        }
        const data = await table.findAll({ attributes: [row] });
        if(!data || !data.length)
            return [];
        return new Set(data.map(entry => entry[row]));
    } catch (e) {
        console.error('Error en la operación readArrayFromData:', e);
    }
}

async function editData(table, edition, parameter) {
    try {
        if(!table) {
            console.error(`Operación editData falló. No existe la tabla solicitada`);
            return;
        }
        const affectedRows = await table.update(edition, { where: {...parameter} });
        return affectedRows;
    } catch (e) {
        console.error('Error en la operación readData:', e);
    }
}

async function editOrWriteData(table, edition, parameter, newEntry = undefined) {
    const affectedRows = await editData(table, edition, parameter);
    if(affectedRows > 0)
        return affectedRows;
    const data = newEntry || {...edition, ...parameter};
    await writeData(table, data);
    return 1;
}

async function createJugador(nombre, nacimiento = undefined, caracteristica = undefined, curiosidad = undefined) {
    const jugador = await writeData(Jugadores, {nombre, nacimiento, caracteristica, curiosidad});
    if(!jugador)
        return;
    console.log(`Jugador ${nombre} creado con éxito`);
    return jugador;
}

async function deleteJugador(nombre) {
    const jugador = await readData(Jugadores, {nombre});
    if(!jugador){
        console.error(`No se encontró al jugador ${nombre}`);
        return;
    }
    try {
        await jugador.destroy();
        console.log(`Jugador ${nombre} eliminado con éxito`);
    } catch (e) {
        console.error(`Error eliminando al jugador ${nombre}: \n`, e);
    }
    return jugador;
}

async function editJugador(nombre, edition) {
    const cambios = await editData(Jugadores, edition, {nombre});
    if (cambios <= 0)
        return;
    console.log(`Jugador ${nombre} editado con éxito`);
    return cambios;
}

async function createPartido(fecha, lugar, descripcion) {
    const partido = await writeData(Partidos, {fecha, lugar, descripcion});
    if(!partido)
        return;
    console.log(`Partido ${fecha} creado con éxito`);
    return partido;
}

async function deletePartido(fecha) {
    const partido = await readData(Partidos, {fecha});
    if(!partido){
        console.error(`No se encontró el partido ${fecha}`);
        return;
    }
    try {
        await partido.destroy();
        console.log(`Partido ${fecha} eliminado con éxito`);
    } catch (e) {
        console.error(`Error eliminando el partido ${fecha}: \n`, e);
    }
    return partido;
}

async function editPartido(fecha, edition) {
    const cambios = await editData(Jugadores, edition, {fecha});
    if (cambios <= 0)
        return;
    console.log(`Partido ${fecha} editado con éxito`);
    return cambios;
}

async function cargarGoles(nombreJugador, fecha, goles) {
    const jugador = await readData(Jugadores, {nombre : nombreJugador});
    if(!jugador) {
        console.error(`No se pudieron cargar los goles. No existe el jugador ${nombreJugador}`);
        return;
    }
    const partido = await readData(Partidos, {fecha});
    if(!partido) {
        console.error(`No se pudieron cargar los goles. No existe el partido ${fecha}`);
        return;
    }
    try {

        await jugador.addPartido(partido);
        const goles_x_partido = await readData(Goles_x_partidos, { jugadoreNombre: jugador.nombre, partidoFecha: partido.fecha })
        goles_x_partido.goles = goles;
        await goles_x_partido.save()
        console.log(`Goles cargados con éxito para el jugador ${nombreJugador}`);
        return goles_x_partido;
    } catch (e) {
        console.error(`Error al cargar los goles del jugador ${nombreJugador}\n`, e);
    }
}

async function eliminarGoles(nombreJugador, fecha) {
    const jugador = await readData(Jugadores, {nombre : nombreJugador});
    if(!jugador) {
        console.error(`No se pudieron eliminar los goles. No existe el jugador ${nombreJugador}`);
        return;
    }
    const partido = await readData(Partidos, {fecha});
    if(!partido) {
        console.error(`No se pudieron eliminar los goles. No existe el partido ${fecha}`);
        return;
    }
    try {
        await jugador.removePartido(partido);
        console.log(`Goles removidos con éxito para el jugador ${nombreJugador}`);
        return 1;
    } catch (e) {
        console.error(`Error al eliminar los goles del jugador ${nombreJugador}\n`, e);
    }
}

async function getGolesPartido(nombre = undefined, fecha = undefined) {
    if(nombre) {
        const jugador = await readData(Jugadores, {nombre});
        if(!jugador) {
            console.error(`Jugador ${nombre} no encontrado`);
            return;
        }
        const partidos = await readArrayFromData(Goles_x_partidos, { jugadoreNombre : jugador.nombre });
        return partidos;
    }
    if(fecha) {
        const partido = await readData(Partidos, {fecha});
        if(!partido) {
            console.error(`Partido ${fecha} no encontrado`);
            return;
        }
        const jugadores = await readArrayFromData(Goles_x_partidos, { partidoFecha : partido.fecha });
        return jugadores;
    }
    console.error("No se proveyó nombre de un jugador ni fecha de un partido para la función getGolesPartido");
    return;
}

async function getJugador(nombre) {
    const jugador = await readData(Jugadores, {nombre});
    if(!jugador) {
        console.error(`El jugador ${nombre} no existe`);
        return;
    }
    const jugadorObj = {
        nombre : jugador.nombre,
        nacimiento : jugador.nacimiento,
        caracteristica : jugador.caracteristica,
        curiosidad : jugador.curiosidad,
        goles : 0,
        partidos : 0,
        detallePartidos: [],
    }
    try {
        const partidos = (await getGolesPartido(nombre, null)) || [];
        jugadorObj.partidos = partidos.length;
        partidos.sort(sortPartidos).forEach(p => { 
            jugadorObj.goles += p.goles; 
            jugadorObj.detallePartidos.push({
                fecha : p.partidoFecha,
                goles : p.goles
            })
        });
    } catch (e) {
        console.error(`Error al leer los partidos del jugador ${nombre}\n`, e);
    }
    return jugadorObj;
}

function sortJugadores(jugadorA, jugadorB) {
    const result = jugadorB.goles - jugadorA.goles;
    if(result)
        return result
    return jugadorA.partidos - jugadorB.partidos 
}

async function getAllJugadores() {
    const jugadores = [];
    const nombres = await getRowValues(Jugadores, 'nombre');
    for(const nombre of nombres) {
        const jugador = await getJugador(nombre);
        jugadores.push(jugador);
    }
    jugadores.sort(sortJugadores);
    for(const i in jugadores) {
        jugadores[i].puesto = Number(i)+1;
    }
    return jugadores;
}

function sortPartidos(partidoA, partidoB) {
    const dateA = new Date(Date.parse(partidoA.fecha+" GMT-0300"));
    const dateB = new Date(Date.parse(partidoB.fecha+" GMT-0300"));
    return dateA - dateB;
}

async function getAllPartidos() {
    const partidos = [];
    const fechas = await getRowValues(Partidos, 'fecha');
    for(const fecha of fechas) {
        const partido = await getPartido(fecha);
        partidos.push(partido);
    }
    return partidos.sort(sortPartidos);
}

async function getPartido(fecha) {
    const partido = await readData(Partidos, {fecha});
    if(!partido) {
        console.error(`El partido ${fecha} no existe`);
        return;
    }
    const partidoObj = {
        fecha : partido.fecha,
        lugar : partido.lugar,
        descripcion : partido.descripcion,
        jugadores : [],
    }
    try {
        const jugadores = (await getGolesPartido(null, fecha)) || [];
        jugadores.forEach(j => { partidoObj.jugadores.push({jugador : j.jugadoreNombre, goles : j.goles}); });
    } catch (e) {
        console.error(`Error al leer los partidos del jugador ${nombre}\n`, e);
    }
    return partidoObj;
}

module.exports = {
    syncDataBase,
    createDate,
    createJugador,
    deleteJugador,
    editJugador,
    createPartido,
    deletePartido,
    editPartido,
    cargarGoles,
    eliminarGoles,
    getJugador,
    getAllJugadores,
    getPartido,
    getAllPartidos,
}

async function test() {
    // await resetDataBase();
    // await createJugador('Bruno');
    // await createJugador('Dante');
    // await createJugador('Mate');
    // await createPartido('2025-07-18');
    // await createPartido('2024-12-09');
    // await cargarGoles('Bruno', '2025-07-18', 3);
    // await cargarGoles('Bruno', '2024-12-09', 2);
    // await cargarGoles('Bruno', '2025-07-18', 1);
    // await cargarGoles('Dante', '2025-07-18', 6);
    // await cargarGoles('Dante', '2024-12-09', 7);
    // await cargarGoles('Mate', '2024-12-09', 18);
    await syncDataBase();
    const partidos = await getAllPartidos();
    console.log(JSON.stringify(partidos, null, 4));
}