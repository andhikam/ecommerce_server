const { beforeAll, describe, test, expect } = require('@jest/globals');
const request = require('supertest');
const app = require('../app');
const { sequelize } = require('../models');
const { queryInterface } = sequelize;
const { hashPassword } = require('../helpers/bcrypt');
const { generateToken } = require('../helpers/jwt');

let token_admin;
let token_customer;
let dummyProductId;

beforeAll((done) => {
	queryInterface
		.bulkInsert(
			'Users',
			[
				{
					email: 'admin@email.com',
					password: hashPassword('123456'),
					role: 'admin',
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			],
			{ returning: true }
		)
		.then((user) => {
			// console.log(user)
			UserId_admin = user[0].id;
			const payload = {
				id: user[0].id,
				email: user[0].email,
				role: user[0].role,
			};
			token_admin = generateToken(payload);
			// console.log(token_admin);
			done();
		})
		.catch((err) => {
			done(err);
		});

	queryInterface
		.bulkInsert(
			'Users',
			[
				{
					email: 'customer1@email.com',
					password: hashPassword('123456'),
					role: 'customer',
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			],
			{ returning: true }
		)
		.then((user) => {
			// console.log(user);
			const payload = {
				id: user[0].id,
				email: user[0].email,
				role: user[0].role,
			};
			token_customer = generateToken(payload);
			// console.log(token_customer);
			done();
		})
		.catch((err) => {
			done(err);
		});

	queryInterface
		.bulkInsert(
			'Products',
			[
				{
					name: 'Barang Dummy',
					image_url: 'Gambar Dummy URL',
					price: 100000,
					stock: 10,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			],
			{ returning: true }
		)
		.then((data) => {
			(dummyProductId = data[0].id),
				// console.log(data);
				done();
		})
		.catch((err) => {
			done(err);
		});
});

afterAll((done) => {
	queryInterface
		.bulkDelete('Users')
		.then((response) => {
			done();
		})
		.catch((err) => {
			done(err);
		});

	queryInterface
		.bulkDelete('Products')
		.then((response) => {
			done();
		})
		.catch((err) => {
			done(err);
		});
});

// --- USER TEST ---

describe('Register User POST /register', () => {
	describe('Success Register', () => {
		test('Success response with Status 201 - returning email', (done) => {
			request(app)
				.post('/register')
				.send({ email: 'customer@email.com', password: '123456' })
				.end((err, res) => {
					const { body, status } = res;
					if (err) {
						return done(err);
					}
					expect(status).toBe(201);
					expect(body).toHaveProperty('email', 'customer@email.com');
					done();
				});
		});
	});
	describe('Error Register', () => {
		test('Error Register with Status 400 - Cant create User because unique validation', (done) => {
			request(app)
				.post('/register')
				.send({ email: 'customer@email.com', password: '123456' })
				.end((err, res) => {
					const { body, status } = res;
					if (err) {
						return done(err);
					}
					expect(status).toBe(400);
					expect(body).toHaveProperty(
						'message',
						'This Email has been Taken, try another one'
					);
					done();
				});
		});
		test('Error Register with Status 400 - Email and Password Cannot be Null', (done) => {
			request(app)
				.post('/register')
				.send({ email: '', password: '' })
				.end((err, res) => {
					const { body, status } = res;
					if (err) {
						return done(err);
					}
					expect(status).toBe(400);
					expect(body).toHaveProperty('message', [
						'Email Cannot be Empty',
						'Password Cannot be Empty',
					]);
					done();
				});
		});
		test('Error Register with Status 400 - Email Cannot be Null', (done) => {
			request(app)
				.post('/register')
				.send({ email: '', password: '123456' })
				.end((err, res) => {
					const { body, status } = res;
					if (err) {
						return done(err);
					}
					expect(status).toBe(400);
					expect(body).toHaveProperty('message', ['Email Cannot be Empty']);
					done();
				});
		});
		test('Error Register with Status 400 - Password Cannot be Null', (done) => {
			request(app)
				.post('/register')
				.send({ email: 'customer@emailcom', password: '' })
				.end((err, res) => {
					const { body, status } = res;
					if (err) {
						return done(err);
					}
					expect(status).toBe(400);
					expect(body).toHaveProperty('message', ['Password Cannot be Empty']);
					done();
				});
		});
	});
});

describe('Login User POST /login', () => {
	describe('Success Login', () => {
		test('Success response with Status 200 - returning Access Token', (done) => {
			request(app)
				.post('/login')
				.send({ email: 'customer@email.com', password: '123456' })
				.end((err, res) => {
					const { status, body } = res;
					if (err) {
						return done(err);
					}
					expect(status).toBe(200);
					expect(body).toHaveProperty('access_token');
					done();
				});
		});
	});
	describe('Error Login', () => {
		test('Error Login Response with Status 400 - Invalid Account or Password', (done) => {
			request(app)
				.post('/login')
				.send({ email: 'customer@email.com', password: '1234567' })
				.end((err, res) => {
					const { status, body } = res;
					if (err) {
						return done(err);
					}
					expect(status).toBe(400);
					expect(body).toHaveProperty('message', 'Invalid Account Or Password');
					done();
				});
		});
		test('Error Login Response with Status 400 - Error Email or Password Cannot Be Null', (done) => {
			request(app)
				.post('/login')
				.send({ email: '', password: '' })
				.end((err, res) => {
					const { status, body } = res;
					if (err) {
						return done(err);
					}
					expect(status).toBe(400);
					expect(body).toHaveProperty(
						'message',
						'Email or Password Cannot be Empty'
					);
					done();
				});
		});
	});
});

// --- PRODUCT TEST ---

describe('Fetch Product GET /products', () => {
	describe('Success Fetch Product', () => {
		test('Success response with Status 200 - returning list of the product', (done) => {
			request(app)
				.get('/products')
				.set('access_token', token_admin)
				.end((err, res) => {
					// console.log(res.body);
					const { body, status } = res;
					if (err) {
						return done(err);
					}
					expect(status).toBe(200);
					expect(body[0].name).toBe('Barang Dummy');
					expect(body[0].image_url).toBe('Gambar Dummy URL');
					done();
				});
		});
	});
	describe('Error Fetch Product', () => {
		test('Error response with Status 401 - No Access Token', (done) => {
			request(app)
				.get('/products')
				.end((err, res) => {
					const { body, status } = res;
					if (err) {
						return done(err);
					}
					expect(status).toBe(401);
					expect(body).toHaveProperty('message', 'Please Login First');
					done();
				});
		});
		test('Error response with Status 404 - Invalid Access Token', (done) => {
			request(app)
				.get('/products')
				.set('access_token', 'some wrong token')
				.end((err, res) => {
					const { body, status } = res;
					if (err) {
						return done(err);
					}
					expect(status).toBe(404);
					expect(body).toHaveProperty('message', 'Invalid Account Or Password');
					done();
				});
		});
	});
});

describe('Create Product POST /products', () => {
	describe('Success Create Product', () => {
		test('Success response with Status 201 - returning value of the product', (done) => {
			request(app)
				.post('/products')
				.set('access_token', token_admin)
				.send({
					name: 'Tas',
					image_url: 'Gambar Tas URL',
					price: 20000,
					stock: 30,
				})
				.end((err, res) => {
					const { body, status } = res;
					if (err) {
						return done(err);
					}
					expect(status).toBe(201);
					expect(body).toHaveProperty('name', 'Tas');
					done();
				});
		});
	});
	describe('Error Create Product', () => {
		test('Error response while Creating Product with Status 401 - Logged In User Role not Admin', (done) => {
			request(app)
				.post('/products')
				.set('access_token', token_customer)
				.send({
					name: 'Tas',
					image_url: 'Gambar Tas URL',
					price: 20000,
					stock: 30,
				})
				.end((err, res) => {
					const { body, status } = res;
					if (err) {
						return done(err);
					}
					expect(status).toBe(401);
					expect(body).toHaveProperty(
						'message',
						'Only Admin Who Have Authorization for this Action'
					);
					done();
				});
		});
		test('Error response with Status 401 - No Access Token', (done) => {
			request(app)
				.post('/products')
				.send({
					name: 'Tas',
					image_url: 'Gambar Tas URL',
					price: 20000,
					stock: 30,
				})
				.end((err, res) => {
					const { body, status } = res;
					if (err) {
						return done(err);
					}
					expect(status).toBe(401);
					expect(body).toHaveProperty('message', 'Please Login First');
					done();
				});
		});
		test('Error response with Status 404 - Invalid Access Token', (done) => {
			request(app)
				.post('/products')
				.set('access_token', 'some wrong token')
				.send({
					name: 'Tas',
					image_url: 'Gambar Tas URL',
					price: 20000,
					stock: 30,
				})
				.end((err, res) => {
					const { body, status } = res;
					if (err) {
						return done(err);
					}
					expect(status).toBe(404);
					expect(body).toHaveProperty('message', 'Invalid Account Or Password');
					done();
				});
		});
		test('Error response while Creating with Status 400 - Products Attributes Cannot be Empty', (done) => {
			request(app)
				.post(`/products`)
				.set('access_token', token_admin)
				.send({
					name: '',
					image_url: '',
					price: '',
					stock: '',
				})
				.end((err, res) => {
					const { body, status } = res;
					if (err) {
						return done(err);
					}
					expect(status).toBe(400);
					expect(body).toHaveProperty('message', [
						"Product's Name Cannot be Empty",
						"Product's Image Cannot be Empty",
						"Product's Price Cannot be Empty",
						"Product's Stock Cannot be Empty",
					]);
					done();
				});
		});
	});
});

describe('Edit Product PUT /products/:id', () => {
	describe('Success Edit Product', () => {
		test('Success Response after Editing with Status 200 - returning value of the edited product', (done) => {
			request(app)
				.put(`/products/${dummyProductId}`)
				.set('access_token', token_admin)
				.send({
					name: 'Barang Baru',
					image_url: 'Gambar Barang Baru',
					price: 90000,
					stock: 10,
				})
				.end((err, res) => {
					const { body, status } = res;
					if (err) {
						return done(err);
					}
					expect(status).toBe(200);
					expect(body).toHaveProperty('name', 'Barang Baru');
					done();
				});
		});
	});
	describe('Error Edit Product', () => {
		test('Error response while Editing with Status 401 - Logged In User Role not Admin', (done) => {
			request(app)
				.put(`/products/${dummyProductId}`)
				.set('access_token', token_customer)
				.send({
					name: 'Barang Baru',
					image_url: 'Gambar Barang Baru',
					price: 90000,
					stock: 10,
				})
				.end((err, res) => {
					const { body, status } = res;
					if (err) {
						return done(err);
					}
					expect(status).toBe(401);
					expect(body).toHaveProperty(
						'message',
						'Only Admin Who Have Authorization for this Action'
					);
					done();
				});
		});
		test('Error response while Editing with Status 404 - Product Id Not Found', (done) => {
			request(app)
				.put(`/products/1`)
				.set('access_token', token_admin)
				.send({
					name: 'Barang Baru',
					image_url: 'Gambar Barang Baru',
					price: 90000,
					stock: 10,
				})
				.end((err, res) => {
					const { body, status } = res;
					if (err) {
						return done(err);
					}
					expect(status).toBe(404);
					expect(body).toHaveProperty('message', 'Product Not Found');
					done();
				});
		});
		test('Error response while Editing with Status 401 - No Access Token', (done) => {
			request(app)
				.put(`/products/${dummyProductId}`)
				.send({
					name: 'Barang Baru',
					image_url: 'Gambar Barang Baru',
					price: 90000,
					stock: 10,
				})
				.end((err, res) => {
					const { body, status } = res;
					if (err) {
						return done(err);
					}
					expect(status).toBe(401);
					expect(body).toHaveProperty('message', 'Please Login First');
					done();
				});
		});
		test('Error response while Editing with Status 401 - Wrong Access Token', (done) => {
			request(app)
				.put(`/products/${dummyProductId}`)
				.set('access_token', 'wrong access token')
				.send({
					name: 'Barang Baru',
					image_url: 'Gambar Barang Baru',
					price: 90000,
					stock: 10,
				})
				.end((err, res) => {
					const { body, status } = res;
					if (err) {
						return done(err);
					}
					expect(status).toBe(404);
					expect(body).toHaveProperty('message', 'Invalid Account Or Password');
					done();
				});
		});
		test('Error response while Editing with Status 400 - Update Attributes Cannot be Empty', (done) => {
			request(app)
				.put(`/products/${dummyProductId}`)
				.set('access_token', token_admin)
				.send({
					name: '',
					image_url: '',
					price: '',
					stock: '',
				})
				.end((err, res) => {
					const { body, status } = res;
					if (err) {
						return done(err);
					}
					expect(status).toBe(400);
					expect(body).toHaveProperty('message', [
						"Product's Name Cannot be Empty",
						"Product's Image Cannot be Empty",
						"Product's Price Cannot be Empty",
						"Product's Stock Cannot be Empty",
					]);
					done();
				});
		});
	});
});

describe('Update Product PATCH /products/:id', () => {
	describe('Success Update Product', () => {
		test('Success Response after Updating with Status 200 - returning value of the updated product', (done) => {
			request(app)
				.patch(`/products/${dummyProductId}`)
				.set('access_token', token_admin)
				.send({
					stock: 11,
				})
				.end((err, res) => {
					const { body, status } = res;
					if (err) {
						return done(err);
					}
					expect(status).toBe(200);
					expect(body).toHaveProperty('stock', 11);
					done();
				});
		});
	});
	describe('Error Update Product', () => {
		test('Error response while Updating with Status 401 - Logged In User Role not Admin', (done) => {
			request(app)
				.patch(`/products/${dummyProductId}`)
				.set('access_token', token_customer)
				.send({
					stock: 11,
				})
				.end((err, res) => {
					const { body, status } = res;
					if (err) {
						return done(err);
					}
					expect(status).toBe(401);
					expect(body).toHaveProperty(
						'message',
						'Only Admin Who Have Authorization for this Action'
					);
					done();
				});
		});
		test('Error response while Updating with Status 404 - Product Id Not Found', (done) => {
			request(app)
				.patch(`/products/1`)
				.set('access_token', token_admin)
				.send({
					stock: 11,
				})
				.end((err, res) => {
					const { body, status } = res;
					if (err) {
						return done(err);
					}
					expect(status).toBe(404);
					expect(body).toHaveProperty('message', 'Product Not Found');
					done();
				});
		});
		test('Error response while Updating with Status 401 - No Access Token', (done) => {
			request(app)
				.patch(`/products/${dummyProductId}`)
				.send({
					stock: 11,
				})
				.end((err, res) => {
					const { body, status } = res;
					if (err) {
						return done(err);
					}
					expect(status).toBe(401);
					expect(body).toHaveProperty('message', 'Please Login First');
					done();
				});
		});
		test('Error response while Updating with Status 404 - Wrong Access Token', (done) => {
			request(app)
				.patch(`/products/${dummyProductId}`)
				.set('access_token', 'wrong access token')
				.send({
					stock: 11,
				})
				.end((err, res) => {
					const { body, status } = res;
					if (err) {
						return done(err);
					}
					expect(status).toBe(404);
					expect(body).toHaveProperty('message', 'Invalid Account Or Password');
					done();
				});
		});
		test('Error response while Updating with Status 400 - Stock Cannot be Empty', (done) => {
			request(app)
				.patch(`/products/${dummyProductId}`)
				.set('access_token', token_admin)
				.end((err, res) => {
					const { body, status } = res;
					if (err) {
						return done(err);
					}
					expect(status).toBe(400);
					expect(body).toHaveProperty('message', 'Stock Cannot be Empty');
					done();
				});
		});
		test('Error response while Updating with Status 400 - Stock Cannot be less than Zero', (done) => {
			request(app)
				.patch(`/products/${dummyProductId}`)
				.set('access_token', token_admin)
				.send({
					stock: -1,
				})
				.end((err, res) => {
					const { body, status } = res;
					if (err) {
						return done(err);
					}
					expect(status).toBe(400);
					expect(body).toHaveProperty('message', 'Stock cannot Less Than Zero');
					done();
				});
		});
	});
});

describe('Delete Product DELETE /products/:id', () => {
	describe('Success Delete Product', () => {
		test('Success Response after Deleting with Status 200 - returning notification message', (done) => {
			request(app)
				.delete(`/products/${dummyProductId}`)
				.set('access_token', token_admin)
				.end((err, res) => {
					const { body, status } = res;
					if (err) {
						return done(err);
					}
					expect(status).toBe(200);
					expect(body).toHaveProperty('message', 'Product Deleted');
					done();
				});
		});
	});
	describe('Error Delete Product', () => {
		test('Error Response while Deleting with Status 401 - Logged In User Role not Admin', (done) => {
			request(app)
				.delete(`/products/${dummyProductId}`)
				.set('access_token', token_customer)
				.end((err, res) => {
					const { body, status } = res;
					if (err) {
						return done(err);
					}
					expect(status).toBe(401);
					expect(body).toHaveProperty(
						'message',
						'Only Admin Who Have Authorization for this Action'
					);
					done();
				});
		});
		test('Error Response while Deleting with Status 404 - Product Id Not Found', (done) => {
			request(app)
				.delete(`/products/1`)
				.set('access_token', token_admin)
				.end((err, res) => {
					const { body, status } = res;
					if (err) {
						return done(err);
					}
					expect(status).toBe(404);
					expect(body).toHaveProperty('message', 'Product Not Found');
					done();
				});
		});
		test('Error Response while Deleting with Status 401 - No Access Token', (done) => {
			request(app)
				.delete(`/products/${dummyProductId}`)
				.end((err, res) => {
					const { body, status } = res;
					if (err) {
						return done(err);
					}
					expect(status).toBe(401);
					expect(body).toHaveProperty('message', 'Please Login First');
					done();
				});
		});
		test('Error Response while Deleting with Status 404 - Wrong Access Token', (done) => {
			request(app)
				.delete(`/products/${dummyProductId}`)
				.set('access_token', 'wrong access token')
				.end((err, res) => {
					const { body, status } = res;
					if (err) {
						return done(err);
					}
					expect(status).toBe(404);
					expect(body).toHaveProperty('message', 'Invalid Account Or Password');
					done();
				});
		});
	});
});