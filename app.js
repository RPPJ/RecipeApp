const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'recipedb'
});

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
    console.log('Connected to the database');
});

app.get('/', (req, res) => {
    let sql = 'SELECT * FROM recipes';
    const query = req.query.query;
    const category = req.query.category;
    
    if (query) {
        sql = 'SELECT * FROM recipes WHERE title LIKE ? OR ingredients LIKE ?';
        connection.query(sql, [`%${query}%`, `%${query}%`], (error, results) => {
            if (error) {
                console.error('Database query error:', error.message);
                return res.status(500).send('Error retrieving recipes');
            }
            res.render('index', { recipes: results });
        });
    } else if (category) {
        sql = 'SELECT * FROM recipes WHERE category LIKE ?';
        connection.query(sql, [`%${category}%`], (error, results) => {
            if (error) {
                console.error('Database query error:', error.message);
                return res.status(500).send('Error retrieving recipes');
            }
            res.render('index', { recipes: results });
        });
    } else {
        connection.query(sql, (error, results) => {
            if (error) {
                console.error('Database query error:', error.message);
                return res.status(500).send('Error retrieving recipes');
            }
            res.render('index', { recipes: results });
        });
    }
});

app.get('/addRecipe', (req, res) => {
    res.render('addRecipe');
});

app.post('/addRecipe', (req, res) => {
    const { title, ingredients, instructions, allergens, user_id, category } = req.body;
    const sql = 'INSERT INTO recipes (title, ingredients, instructions, allergens, user_id, category) VALUES (?, ?, ?, ?, ?, ?)';
    connection.query(sql, [title, ingredients, instructions, allergens, user_id, category], (error, results) => {
        if (error) {
            console.error('Error adding recipe:', error);
            return res.status(500).send('Error adding recipe');
        }
        res.redirect('/');
    });
});

app.get('/editRecipe/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'SELECT * FROM recipes WHERE id = ?';
    connection.query(sql, [id], (error, results) => {
        if (error) {
            console.error('Error fetching recipe:', error);
            return res.status(500).send('Error fetching recipe');
        }
        res.render('editRecipe', { recipe: results[0] });
    });
});

app.post('/editRecipe/:id', (req, res) => {
    const { id } = req.params;
    const { title, ingredients, instructions, allergens, user_id, category } = req.body;
    const sql = 'UPDATE recipes SET title = ?, ingredients = ?, instructions = ?, allergens = ?, user_id = ?, category = ? WHERE id = ?';
    connection.query(sql, [title, ingredients, instructions, allergens, user_id, category, id], (error, results) => {
        if (error) {
            console.error('Error updating recipe:', error);
            return res.status(500).send('Error updating recipe');
        }
        res.redirect('/');
    });
});

app.post('/deleteRecipe/:id', (req, res) => {
    const { id } = req.params;
    
    connection.beginTransaction((err) => {
        if (err) {
            console.error('Error starting transaction:', err);
            return res.status(500).send('Error deleting recipe');
        }

        const deleteSavedRecipesSql = 'DELETE FROM saved_recipes WHERE recipe_id = ?';
        connection.query(deleteSavedRecipesSql, [id], (error) => {
            if (error) {
                return connection.rollback(() => {
                    console.error('Error deleting related saved recipes:', error);
                    res.status(500).send('Error deleting recipe');
                });
            }

            const deleteRecipeSql = 'DELETE FROM recipes WHERE id = ?';
            connection.query(deleteRecipeSql, [id], (error) => {
                if (error) {
                    return connection.rollback(() => {
                        console.error('Error deleting recipe:', error);
                        res.status(500).send('Error deleting recipe');
                    });
                }

                connection.commit((err) => {
                    if (err) {
                        return connection.rollback(() => {
                            console.error('Error committing transaction:', err);
                            res.status(500).send('Error deleting recipe');
                        });
                    }

                    res.redirect('/');
                });
            });
        });
    });
});

app.post('/saveRecipe/:id', (req, res) => {
    const { id } = req.params;
    const userId = 1; 
    const sql = 'INSERT INTO saved_recipes (user_id, recipe_id) VALUES (?, ?)';
    connection.query(sql, [userId, id], (error, results) => {
        if (error) {
            console.error('Error saving recipe:', error);
            return res.status(500).send('Error saving recipe');
        }
        res.redirect('/');
    });
});

app.post('/unsaveRecipe/:id', (req, res) => {
    const { id } = req.params;
    const userId = 1; 
    const sql = 'DELETE FROM saved_recipes WHERE user_id = ? AND recipe_id = ?';
    connection.query(sql, [userId, id], (error, results) => {
        if (error) {
            console.error('Error unsaving recipe:', error);
            return res.status(500).send('Error unsaving recipe');
        }
        res.redirect('/savedRecipes');
    });
});

app.get('/savedRecipes', (req, res) => {
    const userId = 1; 
    const sql = 'SELECT recipes.* FROM recipes JOIN saved_recipes ON recipes.id = saved_recipes.recipe_id WHERE saved_recipes.user_id = ?';
    connection.query(sql, [userId], (error, results) => {
        if (error) {
            console.error('Error retrieving saved recipes:', error);
            return res.status(500).send('Error retrieving saved recipes');
        }
        res.render('index', { recipes: results });
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
