var ngramTypeConfig = {
    el: '#app',
    data: function() {
        return {
            // If there are major schema changes, increment this number.
            // and update the `data-reset-modal` message.
            VERSION: 2.0,

            // Data source mappings.
            bigrams: bigrams,
            trigrams: trigrams,
            tetragrams: tetragrams,
            words: words,
            custom_words: null,

            data: {
                source: 'bigrams',
                soundCorrectLetterEnabled: true,
                soundIncorrectLetterEnabled: true,
                soundPassedThresholdEnabled: true,
                soundFailedThresholdEnabled: true,
                bigrams: {
                    scope: 50,
                    combination: 2,
                    repetition: 3,
                    minimumWPM: 40,
                    minimumAccuracy: 100,
                    WPMs: [],
                    phrases: {},
                    phrasesCurrentIndex: 0,
                    autoProgressEnabled: false,
                },
                trigrams: {
                    scope: 50,
                    combination: 2,
                    repetition: 3,
                    minimumWPM: 40,
                    minimumAccuracy: 100,
                    WPMs: [],
                    phrases: {},
                    phrasesCurrentIndex: 0,
                    autoProgressEnabled: false,
                },
                tetragrams: {
                    scope: 50,
                    combination: 2,
                    repetition: 3,
                    minimumWPM: 40,
                    minimumAccuracy: 100,
                    WPMs: [],
                    phrases: {},
                    phrasesCurrentIndex: 0,
                    autoProgressEnabled: false,
                },
                words: {
                    scope: 50,
                    combination: 2,
                    repetition: 3,
                    minimumWPM: 40,
                    minimumAccuracy: 100,
                    WPMs: [],
                    phrases: {},
                    phrasesCurrentIndex: 0,
                    autoProgressEnabled: false,
                },
                custom_words: {
                    scope: null,
                    combination: 2,
                    repetition: 3,
                    minimumWPM: 40,
                    minimumAccuracy: 100,
                    WPMs: [],
                    phrases: {},
                    phrasesCurrentIndex: 0,
                    autoProgressEnabled: false,
                },
            },

            phrases: [],
            expectedPhrase: '',
            typedPhrase: '',
            typedCharacters: [],
            currentCharIndex: 0,
            startTime: '',
            hitsCorrect: 0,
            hitsWrong: 0,
            isInputCorrect: true,
            rawWPM: 0,
            accuracy: 0,
            showCaret: true,
            caretLeft: 0,
            caretTop: 0,
            typingAreaFocused: false,
        }
    },
    computed: {
        dataSource: function() {
            var dataSource = this.data['source'];
            return this.data[dataSource];
        },
        WPMs: function() {
            var dataSource = this.dataSource;
            return dataSource.WPMs;
        },
        averageWPM: function() {
            var dataSource = this.dataSource;
            if ($.isEmptyObject(dataSource.WPMs)) {
                return 0;
            }

            var sum = dataSource.WPMs.reduce(function(a, b) { return (a + b) }, 0);
            var average = sum / dataSource.WPMs.length;
            return Math.round(average);
        },
        renderedText: function() {
            if (!this.expectedPhrase) {
                return '';
            }

            var html = '';
            var expectedChars = this.expectedPhrase.split('');

            for (var i = 0; i < expectedChars.length; i++) {
                var char = expectedChars[i];
                var classes = ['char'];

                if (i < this.currentCharIndex) {
                    if (this.typedCharacters[i] === char) {
                        classes.push('correct');
                    } else {
                        classes.push('incorrect');
                    }
                } else if (i === this.currentCharIndex) {
                    classes.push('current');
                    classes.push('untyped');
                } else {
                    classes.push('untyped');
                }

                var displayChar = char === ' ' ? '&nbsp;' : char;
                html += '<span class="' + classes.join(' ') + '" data-index="' + i + '">' + displayChar + '</span>';
            }

            return html;
        },
        caretStyle: function() {
            if (!this.expectedPhrase || this.currentCharIndex >= this.expectedPhrase.length) {
                return { display: 'none' };
            }

            const { left, top } = this.getCaretPosition();

            return {
                left: left + 'px',
                top: top + 'px',
                display: 'block'
            };
        },
        caretClasses: function() {
            return {
                'caret': true,
                'caret-blinking': !this.typingAreaFocused,
                'caret-solid': this.typingAreaFocused
            };
        },
    },
    mounted: function() {
        // If there's already saved data.
        if (localStorage.ngramTypeAppdata != undefined) {
            var data = this.getSavedData();
            if (
                !data.hasOwnProperty('version')
                || data.version < this.VERSION
            ) {
                // Reset the old/incompatible data.
                this.reset();
                $('#data-reset-modal').modal('toggle');

                this.refreshPhrases();
                this.updateDataVersion()
            }
            else {
                this.load()
                var dataSource = this.dataSource;
                this.expectedPhrase = dataSource.phrases[dataSource.phrasesCurrentIndex];
            }
        }

        else {
            this.refreshPhrases();
            this.updateDataVersion()
        }

        // Add global keyboard listener for inline typing
        var that = this;
        $(document).on('keydown', function(e) {
            var key = e.originalEvent.code;
            if (key == 'Tab' || key == 'Escape') {
                // Only reset when typing area is focused
                if (that.typingAreaFocused) {
                    e.preventDefault();
                    that.resetCurrentPhraseMetrics();
                }
                return;
            }
        });

        $(document).on('keypress', function(e) {
            // Don't capture input if user is typing in input fields, textareas, or other form elements
            if ($(e.target).is('input, textarea, select') || e.target.contentEditable === 'true') {
                return;
            }

            // Only process keystrokes when typing area is focused
            if (!that.typingAreaFocused) {
                return;
            }

            if (e.which === 0 || e.ctrlKey || e.metaKey || e.altKey) {
                return;
            }

            var char = String.fromCharCode(e.which);
            that.handleCharacterInput(char);
            e.preventDefault();
        });

        $(document).on('keydown', function(e) {
            // Don't capture input if user is typing in input fields, textareas, or other form elements
            if ($(e.target).is('input, textarea, select') || e.target.contentEditable === 'true') {
                return;
            }

            // Only process keystrokes when typing area is focused
            if (!that.typingAreaFocused) {
                return;
            }

            if (e.originalEvent.code === 'Backspace') {
                that.handleBackspace();
                e.preventDefault();
            }
        });

        this.correctLetterSound = new Audio('./media/sounds/click.mp3');
        this.incorrectLetterSound = new Audio('./media/sounds/clack.mp3');
        this.incorrectPhraseSound = new Audio('./media/sounds/failed.mp3');
        this.correctPhraseSound = new Audio('./media/sounds/ding.wav');
        this.currentPlayingSound = null;

        // Focus the typing area to capture keyboard events and add focus tracking
        $('#typing-area').focus();

        // Track focus state for caret blinking
        $('#typing-area').on('focus', function() {
            that.typingAreaFocused = true;
        });

        $('#typing-area').on('blur', function() {
            that.typingAreaFocused = false;
        });

        // Set initial focus state
        this.typingAreaFocused = true;
    },
    watch: {
        'data.source': function() {
            var dataSource = this.dataSource;

            // Set or get the last saved lesson.
            if ($.isEmptyObject(dataSource.phrases)) {
                this.refreshPhrases();
            }

            else {
                this.expectedPhrase = dataSource.phrases[dataSource.phrasesCurrentIndex];
                // Save state in case of page reload.
                this.save();
            }

            this.resetCurrentPhraseMetrics();
        },
        'data.soundCorrectLetterEnabled': function() {
            this.save();
        },
        'data.soundIncorrectLetterEnabled': function() {
            this.save();
        },
        'data.soundPassedThresholdEnabled': function() {
            this.save();
        },
        'data.soundFailedThresholdEnabled': function() {
            this.save();
        },
        custom_words: function() {
            this.refreshPhrasesAndCurrentMetrics();
        },
        WPMs: function() {
            return this.averageWPM;
        },
    },
    methods: {
        save: function() {
            localStorage.ngramTypeAppdata = JSON.stringify(this.data);
        },
        load: function() {
            this.data = JSON.parse(localStorage.ngramTypeAppdata);
        },
        reset: function() {
            localStorage.removeItem('ngramTypeAppdata');
        },
        getSavedData: function() {
            return JSON.parse(localStorage.ngramTypeAppdata);
        },
        updateDataVersion: function() {
            this.data.version = this.VERSION;
            this.save();
        },
        deepCopy: function(arrayOrObject) {
            var emptyArrayOrObject = $.isArray(arrayOrObject) ? [] : {};
            return $.extend(true, emptyArrayOrObject, arrayOrObject);
        },
        shuffle: function(array) {
            for (var i = array.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
        },
        stopCurrentPlayingSound: function() {
            // Sounds at the end of each phrase/lesson
            // dont need to be played from the beginning.
            if (
                this.currentPlayingSound == this.correctPhraseSound
                || this.currentPlayingSound == this.incorrectPhraseSound
            ) {
                return;
            }

            // Reset any playing sound to handle fast typing,
            // Otherwise, the sound will be intermittent and
            // not in sync with the key presses.
            if (this.currentPlayingSound) {
                this.currentPlayingSound.currentTime = 0;
            }
        },
        refreshPhrases: function() {
            var dataSource = this.dataSource;

            if (dataSource.combination < 1) {
                dataSource.combination = 1
            }

            dataSource.phrases = this.generatePhrases(dataSource.combination, dataSource.repetition);
            this.expectedPhrase = dataSource.phrases[0];
            dataSource.phrasesCurrentIndex = 0;
            this.save();
        },
        refreshPhrasesAndCurrentMetrics: function() {
            this.refreshPhrases();
            this.resetCurrentPhraseMetrics();
            this.pauseTimer();
        },
        generatePhrases: function(numberOfItemsToCombine, repetitions) {
            var dataSource = this.data['source'];
            var source = this[dataSource];
            var scope = this.data[dataSource].scope

            // Use indexing to limit scope of Ngrams.
            // Select the Top 50/100/150/200.
            // `Custom` has no scope.
            if (scope) {
                source = source.slice(0, scope)
            }

            var ngrams = this.deepCopy(source);

            this.shuffle(ngrams);
            var ngramsProcessed = 0;
            var phrases = [];

            while (ngrams.length) {
                var ngramsSublist = ngrams.slice(0, numberOfItemsToCombine);
                var subPhrase = ngramsSublist.join(' ');
                var _phrase = [];
                for (var i = 0; i < repetitions; i++) {
                    _phrase.push(subPhrase);
                }
                phrases.push(_phrase.join(' '));
                // Remove the processed ngrams.
                ngrams.splice(0, numberOfItemsToCombine);
            }

            return phrases
        },
        pauseTimer: function(e) {
            var isStopped = $('.timer').countimer('stopped');
            if (!isStopped) {
                $('.timer').countimer('stop');
            }
        },
        resumeTimer: function(e) {
            var isStopped = $('.timer').countimer('stopped');
            if (isStopped) {
                $('.timer').countimer('resume');
            }
        },
        getCaretPosition: function() {
            var charElements = $('.text-display .char');
            const leftOffset = 8;
            const topOffset = 14;

            var prevChar = charElements[this.currentCharIndex - 1];
            if (prevChar) {
                var $prevChar = $(prevChar);
                var prevPosition = $prevChar.position();
                return {
                    left: prevPosition.left + $prevChar.outerWidth() + leftOffset,
                    top: prevPosition.top + topOffset
                };
            }

            return { left: leftOffset, top: topOffset };
        },
        handleCharacterInput: function(char) {
            if (this.currentCharIndex >= this.expectedPhrase.length) {
                return;
            }

            if (this.currentCharIndex === 0) {
                this.startTime = new Date().getTime() / 1000;
                this.resumeTimer();
            }

            var expectedChar = this.expectedPhrase[this.currentCharIndex];
            this.typedCharacters[this.currentCharIndex] = char;

            if (char === expectedChar) {
                if (this.data.soundCorrectLetterEnabled) {
                    this.stopCurrentPlayingSound();
                    this.correctLetterSound.play();
                    this.currentPlayingSound = this.correctLetterSound;
                }
                this.hitsCorrect += 1;
            } else {
                if (this.data.soundIncorrectLetterEnabled) {
                    this.stopCurrentPlayingSound();
                    this.incorrectLetterSound.play();
                    this.currentPlayingSound = this.incorrectLetterSound;
                }
                this.hitsWrong += 1;
            }

            this.currentCharIndex += 1;

            if (this.currentCharIndex >= this.expectedPhrase.length) {
                this.checkPhraseCompletion();
            }
        },
        handleBackspace: function() {
            if (this.currentCharIndex > 0) {
                this.currentCharIndex -= 1;
                this.typedCharacters.splice(this.currentCharIndex, 1);
            }
        },
        checkPhraseCompletion: function() {
            var currentTime = new Date().getTime() / 1000;
            this.rawWPM = Math.round(
                ((this.hitsCorrect + this.hitsWrong) / 5) / (currentTime - this.startTime) * 60
            );

            this.accuracy = Math.round(
                this.hitsCorrect / (this.hitsCorrect + this.hitsWrong) * 100
            );

            var dataSource = this.dataSource;
            if (
                this.rawWPM < dataSource.minimumWPM
                || this.accuracy < dataSource.minimumAccuracy
            ) {
                if (this.data.soundFailedThresholdEnabled) {
                    this.stopCurrentPlayingSound();
                    this.incorrectPhraseSound.play();
                    this.currentPlayingSound = this.incorrectPhraseSound;
                }
                this.resetCurrentPhraseMetrics();
                this.pauseTimer()
                return;
            }

            var newRoundStarted = (dataSource.phrasesCurrentIndex == 0);
            if (newRoundStarted) {
                dataSource.WPMs = [];
            }
            dataSource.WPMs.push(this.rawWPM);

            if (this.data.soundPassedThresholdEnabled) {
                this.stopCurrentPlayingSound();
                this.correctPhraseSound.play();
                this.currentPlayingSound = this.correctPhraseSound;
            }
            this.pauseTimer()
            this.nextPhrase();
        },
        resetCurrentPhraseMetrics: function() {
            this.hitsCorrect = 0;
            this.hitsWrong = 0;
            this.typedPhrase = '';
            this.typedCharacters = [];
            this.currentCharIndex = 0;
            this.caretLeft = 0;
            this.caretTop = 0;
            this.isInputCorrect = true;
        },
        nextPhrase: function() {
            this.resetCurrentPhraseMetrics();
            var dataSource = this.dataSource;
            var nextPhraseExists = (dataSource.phrases.length > dataSource.phrasesCurrentIndex + 1);
            if (nextPhraseExists) {
                dataSource.phrasesCurrentIndex += 1;
                this.expectedPhrase = dataSource.phrases[dataSource.phrasesCurrentIndex];
                this.save();
            }
            // Start again from beginning, but generate new data.
            else {
                if (dataSource.autoProgressEnabled) {
                    this.autoProgress();
                }
                this.refreshPhrases();
            }
        },
        autoProgress: function() {
            var dataSource = this.dataSource;
            var maxCombination = 10;
            var minRepetition = 1;
            var minCombination = 3;

            // First, try to increase combination
            if (dataSource.combination < maxCombination) {
                dataSource.combination += 1;
            }
            // If combination is at max, decrease repetition and reset combination
            else if (dataSource.repetition > minRepetition) {
                dataSource.repetition -= 1;
                dataSource.combination = minCombination;
            }
        },
        customWordsModalShow: function() {
            var $customWordsModal = $('#custom-words-modal');
            var customWords = this.custom_words.join('\n')
            $customWordsModal.find('textarea').val(customWords);
        },
        customWordsModalSubmit: function() {
            var $customWordsModal = $('#custom-words-modal');
            var customWordsSubmitted = $customWordsModal.find('textarea').val();

            // Convert to array, remove the empty string.
            var customWordsProccessed = customWordsSubmitted.split(/\s+/).filter(function(element) { return element });

            $customWordsModal.modal("hide");
            this.custom_words = customWordsProccessed;
        },
    },
};

var ngramTypeApp = new Vue(ngramTypeConfig);
