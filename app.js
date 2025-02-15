require('dotenv').config();
const cors = require('cors');
const database = require("./database")
const express = require('express');
const jwt = require('jsonwebtoken');

const SECRET = process.env.SECRET
const PORT = process.env.PORT || 4000;
database.syncDataBase();

const app = express();
app.use(cors({
    origin: process.env.CORS_ORIGIN
}))
app.use(express.json());

app.listen(PORT, () => {
    console.log("Server Listening on PORT:", PORT);
});

app.get('/', (req, res) => {
    return res.send('API de goles');
});

app.get('/jugador', async (req, res) => {
    const nombre = req.query.nombre;
    if(!nombre) {
        return res.status(400).json({ message: "Nombre is required" });
    }
    const jugador = await database.getJugador(nombre);
    if(!jugador) {
        res.sendStatus(404);
        return;
    }
    res.send(JSON.stringify(jugador, null, 4));
});

app.get('/jugadores', async (req, res) => {
    const jugadores = await database.getAllJugadores();
    res.send(JSON.stringify(jugadores, null, 4));
});

app.get('/partidos', async (req, res) => {
    const partidos = await database.getAllPartidos();
    res.send(JSON.stringify(partidos, null, 4));
});

app.post("/login", (req, res) => {
    try {
        const password = req.body.password;
        if (!password) {
            return res.status(400).json({ message: "Password is required" });
        }
        if (password === SECRET) {
            const token = jwt.sign({ username: 'admin' }, SECRET, { expiresIn: "1h" });
            return res.status(200).json({ token });
        } else {
            return res.status(401).json({ message: "Authentication failed (Contraseña incorrecta)" });
        }
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" });
    }
});

function verifyToken(req, res, next) {
    const header = req.header("Authorization") || "";
    const token = header.split(" ")[1];
    if (!token) {
        return res.status(401).json({ message: "Token not provided" });
    }
    try {
        const payload = jwt.verify(token, SECRET);
        req.username = payload.username;
        next();
    } catch (error) {
        return res.status(403).json({ message: "Token not valid" });
    }
}

app.post("/jugadores", verifyToken, async (req, res) => {
    const nombre = req.body.nombre;
    if (!nombre) {
        return res.status(400).json({ message: "Nombre is required" });
    }
    const nacimiento = req.body.nacimiento || null;
    const caracteristica = req.body.caracteristica || null;
    const curiosidad = req.body.curiosidad || null;
    try {
        const result = await database.createJugador(nombre, nacimiento, caracteristica, curiosidad);
        if(!result) {
            return res.status(401).json({ message: "Error al crear nuevo jugador" });
        }
        return res.status(201).json({ message: "Nuevo jugador creado con éxito" });
    } catch(e) {
        return res.status(500).json({ message: "Internal server error" });
    }
});

app.put("/jugadores/goles", verifyToken, async (req, res) => {
    const nombre = req.body.nombre;
    if (!nombre)
        return res.status(400).json({ message: "Nombre is required" });
    const fecha = req.body.fecha;
    if (!fecha)
        return res.status(400).json({ message: "Fecha is required" });
    const goles = req.body.goles;
    if (!goles)
        return res.status(400).json({ message: "Goles is required" });
    try {
        const result = await database.cargarGoles(nombre, fecha, goles);
        if(!result) {
            return res.status(401).json({ message: "Error al cargar goles al jugador" });
        }
        return res.status(200).json({ message: "Goles cargados con éxito al jugador" });
    } catch(e) {
        return res.status(500).json({ message: "Internal server error" });
    }
});

app.delete("/jugadores/goles", verifyToken, async (req, res) => {
    const nombre = req.body.nombre;
    if (!nombre)
        return res.status(400).json({ message: "Nombre is required" });
    const fecha = req.body.fecha;
    if (!fecha)
        return res.status(400).json({ message: "Fecha is required" });
    try {
        const result = await database.eliminarGoles(nombre, fecha);
        if(!result) {
            return res.status(401).json({ message: "Error al eliminar goles al jugador" });
        }
        return res.status(200).json({ message: "Goles eliminados con éxito al jugador" });
    } catch(e) {
        return res.status(500).json({ message: "Internal server error" });
    }
});

app.post("/partidos", verifyToken, async (req, res) => {
    const fecha = req.body.fecha;
    if (!fecha) {
        return res.status(400).json({ message: "Fecha inválida" });
    }
    const lugar = req.body.lugar || null;
    try {
        const result = await database.createPartido(fecha, lugar);
        if(!result) {
            return res.status(401).json({ message: "Error al crear nuevo partido" });
        }
        return res.status(200).json({ message: "Nuevo partido creado con éxito" });
    } catch(e) {
        return res.status(500).json({ message: "Internal server error" });
    }
});
