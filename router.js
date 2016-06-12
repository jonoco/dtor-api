const passportService = require('./services/passport');
const passport        = require('passport');
const router          = require('express').Router();

const BaseController  = require('./controllers/base');
const AuthController  = require('./controllers/authentication');
const DrivController  = require('./controllers/drive');
const TorrController  = require('./controllers/torrent');

const requireAuth = passport.authenticate('jwt', { session: false });
const requireSignin = passport.authenticate('local', { session: false });

router.get('/', BaseController.root);
router.post('/signup', AuthController.signup);
router.post('/login', requireSignin, AuthController.login);
router.get('/login/drive', requireAuth, DrivController.login);
router.get('/auth', requireAuth, DrivController.authClient);
router.post('/torrent', requireAuth, TorrController.getTorrent);
router.get('/torrent/:id', TorrController.downloadTorrent);
router.delete('/torrent', TorrController.deleteTorrent)

module.exports = router;
