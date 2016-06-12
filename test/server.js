const http = require('http');
const assert = require('chai').assert;

require('../server.js');

const ROOT_URL = 'http://127.0.0.1:3090/api';

describe('server', () => {
	describe('GET /', () => {
		it('should return 200', () => {
	    http.get(ROOT_URL, res => {
	      assert.equal(200, res.statusCode);
	    });
	  });
	})
});
