<!DOCTYPE html>
<html>

<head>
    <title>Pong</title>
    <style>
        canvas {
            width: 800px;
            height: 500px;
            border: solid red 4px;
            background-color: black;
        }
    </style>
</head>

<body>
    <canvas id="canvas"></canvas>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/immutable/3.8.1/immutable.js"></script>
    <script>
        var Map = Immutable.Map;
        var List = Immutable.List;

        var canvas = document.getElementById('canvas');
        var ctx = canvas.getContext('2d');
        canvas.width = 800;
        canvas.height = 500;

        const MAX_SCORE = 5;
        const PADDLE_SPEED = 4;

        const WIN_SOUND = new Audio('win.mp3');
        const PONG_SOUND = new Audio('pong.mp3');
        const SCORE_SOUND = new Audio('woohoo.wav');

        if (navigator.userAgent.search("Firefox") > -1) {
            var GAMEPAD_UP = 14;
            var GAMEPAD_DOWN = 15;
        } else {  // chrome
            var GAMEPAD_UP = 12;
            var GAMEPAD_DOWN = 13;
        }


        var keys = {
            up: false,
            down: false,
            a: false,
            z: false
        };


        var state = Map({
            gameOver: false,
            left: Map({
                score: 0,
                scoreX: 362,
                scoreY: 30,
                y: 200,
                x: 20,
                width: 20,
                height: 110,
                gamepad: null
            }),
            right: Map({
                score: 0,
                scoreX: 420,
                scoreY: 30,
                x: canvas.width - 20 - 20,
                y: 200,
                width: 20,
                height: 110,
                gamepad: null
            }),
            ball: Map({
                x: canvas.width / 2,
                y: canvas.height / 2,
                dx: 3,
                dy: 5,
                radius: 15
            })
        });


        document.body.addEventListener('keydown', function(evt) {
            switch (evt.keyCode) {
                case 38:
                    keys.up = true;
                    break;
                case 40:
                    keys.down = true;
                    break;
                case 65:
                    keys.a = true;
                    break;
                case 90:
                    keys.z = true;
                    break;
                case 82:
                    // 'r'
                    if (gameOver) {
                        resetGame();
                    }
                    break;
            }
        });

        document.body.addEventListener('keyup', function(evt) {
            switch (evt.keyCode) {
                case 38:
                    keys.up = false;
                    break;
                case 40:
                    keys.down = false;
                    break;
                case 65:
                    keys.a = false;
                    break;
                case 90:
                    keys.z = false;
                    break;
            }
        });

        window.addEventListener("gamepadconnected", function(e) {
            var gp = navigator.getGamepads()[e.gamepad.index];
            console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.",
                gp.index, gp.id,
                gp.buttons.length, gp.axes.length);
            if (left.gamepad === null) {
                left.gamepad = gp;
            } else if (right.gamepad === null) {
                right.gamepad = gp;
            }
        });

        function draw() {
            // clear screen
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (gameOver) {
                ctx.font = '100px sans-serif';
                ctx.fillStyle = 'white';
                ctx.fillText('GAME OVER', 100, 270);
                return;
            }

            // draw net
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            var mid = canvas.width / 2;
            ctx.fillRect(mid - 10, 0, 20, canvas.height);

            // draw left paddle
            ctx.fillStyle = 'orange';
            ctx.fillRect(left.x, left.y, left.width, left.height);

            // draw right paddle
            ctx.fillStyle = 'green';
            ctx.fillRect(right.x, right.y, right.width, right.height);

            // draw ball
            ctx.fillStyle = 'red';
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2, false);
            ctx.fill();

            // draw score
            ctx.font = '30px sans-serif';
            ctx.fillStyle = 'white';
            ctx.fillText(left.score, left.scoreX, left.scoreY);
            ctx.fillText(right.score, right.scoreX, right.scoreY);
        }

        function input() {
            initGamepads();

            var input = {
                leftUp: false,
                leftDown: false,
                rightUp: false,
                rightDown: false
            };

            if (right.gamepad !== null) {
                input.rightUp = keys.up || right.gamepad.buttons[GAMEPAD_UP].pressed;
                input.rightDown = keys.down || right.gamepad.buttons[GAMEPAD_DOWN].pressed;
            } else {
                input.rightUp = keys.up;
                input.rightDown = keys.down;
            }

            if (left.gamepad !== null) {
                input.leftUp = keys.a || left.gamepad.buttons[GAMEPAD_UP].pressed;
                input.leftDown = keys.z || left.gamepad.buttons[GAMEPAD_DOWN].pressed;
            } else {
                input.leftUp = keys.a;
                input.leftDown = keys.z;
            }

            return Map(input);
        }

        function updatePaddles(input, state) {
            var left = state.get('left');
            var right = state.get('right');

            if (input.get('rightUp') && input.get('rightDown')) {
                // don't move when both are pressed
            } else if (input.get('rightUp')) {
                right = right.set('y', right.get('y') - PADDLE_SPEED);
                if (right.get('y') < 0) {
                    right = right.set('y', 0);
                }
            } else if (input.get('rightDown')) {
                right = right.set('y', right.get('y') + PADDLE_SPEED);
                if (right.get('y') + right.get('height') > canvas.height) {
                    right = right.set('y', canvas.height - right.get('height'));
                }
            }

            if (input.get('leftUp') && input.get('leftDown')) {
                // don't move when both are pressed
            } else if (input.get('leftUp')) {
                left = left.set('y', left.get('y') - PADDLE_SPEED);
                if (left.get('y') < 0) {
                    left = left.set('y', 0);
                }
            } else if (input.get('leftDown')) {
                left = left.set('y', left.get('y') + PADDLE_SPEED);
                if (left.get('y') + left.get('height') > canvas.height) {
                    left = left.set('y', canvas.height - left.get('height'));
                }
            }

            return state.merge({
                left: left,
                right: right,
            };
        }

        function update(input, state) {

            if (gameOver) {
                return;
            }

            var st = updatePaddles(input,
                state.get('left'),
                state.get('right')
            );

            // move ball
            var ball = st.get('ball');
            var newX = ball.get('dx') + ball.get('x');
            var newY = ball.get('dy') + ball.get('y');
            var newBall = st.get('ball').merge({x: newX, y: newY});

            if (ball.y - ball.radius < 0) {
                // bounce off ceiling
                ball.y = ball.radius;
                ball.dy = -ball.dy;
            } else if (ball.y + ball.radius > canvas.height) {
                // bounce off floor
                ball.y = canvas.height - ball.radius;
                ball.dy = -ball.dy;
            }

            // hit right wall, left scores
            if (ball.x + ball.radius > canvas.width) {
                left.score++;
                if (left.score === MAX_SCORE) {
                    gameOver = true;
                    WIN_SOUND.play();
                } else {
                    SCORE_SOUND.play();
                }
                resetServe();
            }

            // hit left wall, right scores
            if (ball.x - ball.radius < 0) {
                right.score++;
                if (right.score === MAX_SCORE) {
                    gameOver = true;

                } else {

                }
                resetServe();
            }

            // hit paddles
            if (intersect(ball, right)) {
                ball.x = right.x - ball.radius;
                ball.dx = -ball.dx;

            } else if (intersect(ball, left)) {
                ball.x = left.x + left.width + ball.radius;
                       = state.get('left').get('x') + state.get('left').get('width') + newBall.get('radius')
                ball.dx = -ball.dx;



state.merge(state.get('left'): state.get('left').get('score')++)
</body>

</html>
