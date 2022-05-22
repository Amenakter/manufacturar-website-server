const express = require('express');;
const app = express();
const cors = require('cors');
port = process.env.PORT || 5000;
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');

app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cnn4g.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect()
        const toolCollection = client.db('tools').collection('divices')
        console.log('conntect');

        app.get("/products", async (req, res) => {
            const result = await toolCollection.find().toArray();
            res.send(result)
        })
        app.post('/addProducts', async (req, res) => {
            const addedProduct = req.body;
            const product = await toolCollection.insertOne(addedProduct);
            res.send(product)
        })
    }
    finally {

    }
}
run().catch(console.dir)

app.get('/', (req, res) => {
    res.send('hello')
})

app.listen(port, () => {
    console.log('i am listening');
})