const express = require('express');;
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
port = process.env.PORT || 5000;
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cnn4g.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// verifay user email
function verifyJTW(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: "UnAuthorization" });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: "forbidden access" })

        }
        req.decoded = decoded;
        next()
    });
}


async function run() {
    try {
        await client.connect()
        const toolCollection = client.db('tools').collection('divices')
        const orderCollection = client.db('tools').collection('orders')
        const userCollection = client.db('tools').collection('users')
        const reviewCollection = client.db('tools').collection('reviews')
        const paymentCollection = client.db('tools').collection('payments')
        console.log('conntect');

        app.get("/products", async (req, res) => {
            const result = await toolCollection.find().toArray();
            res.send(result)
        })

        //insert product
        app.post('/addProducts', async (req, res) => {
            const addedProduct = req.body;
            const product = await toolCollection.insertOne(addedProduct);
            res.send(product)
        })
        // find a single product
        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const searchItem = await toolCollection.findOne(query);
            res.send(searchItem)
        })

        // store order data
        app.post('/order', async (req, res) => {
            const findOder = req.body;
            const order = await orderCollection.insertOne(findOder);
            res.send(order)
        })

        app.get('/order/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.findOne(query);
            res.send(result);
        })

        app.get('/order', verifyJTW, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            if (email === decodedEmail) {
                const query = { email: email }
                const cursoe = orderCollection.find(query)
                const orders = await cursoe.toArray();
                return res.send(orders);
            }
            else {
                return res.status(403).send({ message: "forbidden access" })
            }

        })
        app.patch('/order/:id', verifyJTW, async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const query = { _id: ObjectId(id) };
            const updateDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const result = await paymentCollection.insertOne(payment);
            const updatedOrder = await orderCollection.updateOne(query, updateDoc);
            res.send(updateDoc)
        })


        app.get('/allOrders', async (req, res) => {
            const allOrder = await orderCollection.find().toArray();
            res.send(allOrder);
        })

        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email }
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "1d" });
            res.send({ result, token })
        })
        app.put('/user/admin/:email', verifyJTW, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email }
            const requesterUser = req.decoded.email;
            const requesterInfo = await userCollection.findOne({ email: requesterUser });
            if (requesterInfo.role == 'admin') {
                const options = { upsert: true };
                const updateDoc = {
                    $set: { role: "admin" },
                };
                const result = await userCollection.updateOne(filter, updateDoc, options);
                res.send(result);
            }
            else {
                return res.status(403).send({ message: "forbidden access" })
            }

        })

        // load alluser
        app.get('/allUser', verifyJTW, async (req, res) => {
            const allUser = await userCollection.find().toArray();
            res.send(allUser)
        })
        app.get('/user/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const searchUser = await userCollection.findOne(query);
            res.send(searchUser)
        })
        app.delete('/user/:id', async (req, res) => {
            const deletedUser = req.params.id;
            const query = { _id: ObjectId(deletedUser) }
            const result = await userCollection.deleteOne(query)
            res.send(result);
        })

        app.post('/reviews', async (req, res) => {
            const review = req.body;
            const result = await reviewCollection.insertOne(review);
            res.send(result);
        })
        app.get('/reveiws', async (req, res) => {
            const reviews = await reviewCollection.find().toArray();
            res.send(reviews);
        })

        app.post('/create-payment-intent', verifyJTW, async (req, res) => {
            const order = req.body;
            const price = order.price;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({
                clientSecret: paymentIntent.client_secret
            });

        });

        app.delete('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(query);
            res.send(result);

        })
        app.delete('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await toolCollection.deleteOne(query);
            res.send(result)
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