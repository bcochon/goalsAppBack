const database = require("./database")
const express = require('express');

const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());

app.listen(PORT, () => {
    console.log("Server Listening on PORT:", PORT);
});

app.get('/status', (request, response) => {
    const status = {
        "Status": "Running"
    };
    response.send(status);
});

app.get('/jugador', async (request, response) => {
    const nombre = request.query.nombre;
    if(!nombre) {
        response.sendStatus(400);
        return;
    }
    const jugador = await database.getJugador(nombre);
    if(!jugador) {
        response.sendStatus(404);
        return;
    }
    response.send(jugador);
});

app.get('/jugadores', async (request, response) => {
    const jugadores = await database.getAllJugadores();
    response.send(jugadores);
});

app.get('/partidos', async (request, response) => {
    const partidos = await database.getAllPartidos();
    response.send(partidos);
});