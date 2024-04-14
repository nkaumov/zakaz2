
import express from 'express';
import session from 'express-session'
import exphbs  from 'express-handlebars';
import mysql from 'mysql2';


let sets = {
    host: 'localhost',
    user: 'root',
    password: '1234',
    database: 'deveve',
    charset : 'utf8mb4_0900_ai_ci',
    
}

const pool = mysql.createPool(sets).promise();

export async function checkConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('Успешное подключение к БД');
        connection.release();
    } catch (err) {
        console.error('Ошибка подключения к БД:', err);
    }
}

const app = express()
const hbs = exphbs.create({
    defaultLayout: 'main',
    extname: 'hbs'
})
app.use(session({
  secret: 'your-unique-and-hard-to-guess-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // change to true when using HTTPS
}))


app.engine('hbs', hbs.engine)
app.set('view engine', 'hbs')
app.set('views', 'views')
app.use(express.urlencoded({ extended: true }))








app.get('/', (req,res) => {
    res.render ('auth', {
      user: req.session.user,
    })
});

app.get('/reg', (req,res) => {
    res.render('reg')
});


app.post('/register', async (req,res) => {
    const {username, password } = req.body; 

    const [rows] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
  if (rows.length > 0) {

    res.send('Пользователь с таким username уже существует');
  } else {
    await pool.execute('INSERT INTO users (username, password, admin) VALUES (?, ?, ?)', [username, password, 0]);
    res.redirect('/');
  }
});


app.post('/myzakaz', async (req, res) => {
    const {username, password } = req.body;
    console.log(username, password)
    const [rows] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
    
    if (rows.length > 0) {
      const user = rows[0];
  
      if (password === user.password) {
        req.session.userId = user.id; // сохраняем userId в сессии
        req.session.user = user; // сохраняем всего пользователя в сессии
        res.render('myZakaz.hbs', { user: user});
      } else {       
  
        res.send('Неверный пароль');
      }
    } else {  
      res.send('Пользователь с таким username не найден');
    }
  });

  // выход из системы 
app.get('/logout', (req, res) => {
  // Удаляем данные сессии
  req.session.destroy(err => {
      if (err) {
          console.error('Ошибка при выходе из системы:', err);
          res.redirect('/'); // Если произошла ошибка, перенаправляем пользователя на главную страницу
      } else {
          // После успешного выхода из системы перенаправляем пользователя на страницу авторизации
          res.redirect('/');
      }
  });
});

// добавление нового заказа
// Добавляем маршрут для страницы добавления нового заказа
app.get('/newzakaz', (req, res) => {
  res.render('newZakaz.hbs', {        
    user: req.session.user,
  }); // Рендерим страницу newZakaz.hbs при обращении к /newzakaz
});


app.get('/myzakaz', async (req, res) => {
  try {
    const userId = req.session.user.id; // Получение идентификатора текущего пользователя

    const query = 'SELECT * FROM orders WHERE user_id = ?';
    const [rows] = await pool.query(query, [userId]);

    res.render('myzakaz.hbs', { 
      user: req.session.user,
      orders: rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/submit-order', async (req, res) => {
  const order = req.body;

  // Получение userId из сессии
  const userId = req.session.userId;
  
if (userId) {
  await pool.execute(
    'INSERT INTO Orders (ProductName, Quantity, URL, StartDate, EndDate, Author, Status, userId) VALUES (?, ?, ?, ?, ?, ?, "На рассмотрении", ?)',
    [order.ProductName, order.quantity, order.url, order.startDate, order.endDate, order.author, userId].map(param => {
      if (typeof param === 'undefined') {
        return null;
      }
      return param;
    })
  );
  console.log('Заказ успешно отправлен!');
  res.json({ message: 'Заказ успешно отправлен!' });
} else {
  res.status(400).json({ error: 'Ошибка: userId не определен' });
}

});

app.get('/myZakaz', async (req, res) => {
  if(req.session.user) {
    const userId = req.session.user.id;
  
    const [rows] = await pool.execute('SELECT * FROM orders WHERE UserID = ?',
      [userId]
    );
 
    const orders = rows.map(row => {
      return {
        OrderID: row.OrderID,
        ProductName: row.ProductName,
        Quantity: row.Quantity,
        URL: row.URL,
        StartDate: row.StartDate,
        EndDate: row.EndDate,
        Author: row.Author,
        Status: row.Status
      };
    }); 

    res.render('myZakaz.hbs', { title: 'orders', user: req.session.user, orders });
  } else {
    res.redirect('/auth');
  }
});



app.listen(3000, async () => {
    console.log('Сервер был запущен...')
    await checkConnection();
});



