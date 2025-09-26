# Ngram Type Project Summary

## Overview
Ngram Type is a touch typing trainer that uses N-grams (character sequences) as training data instead of traditional random words. It's built as a single-page web application using Vue.js 2.6.12.

## Architecture

### Frontend Framework
- **Vue.js 2.6.12**: Main application framework
- **Bootstrap 4.6.2**: UI styling (Darkly theme)
- **jQuery 3.5.1**: DOM manipulation and event handling
- **Font Awesome 4.7.0**: Icons

### Core Components

#### Data Sources (`/ngrams/`)
- `bigrams.js`: 2-character sequences (e.g., "th", "he", "in")
- `trigrams.js`: 3-character sequences
- `tetragrams.js`: 4-character sequences
- `words.js`: Common English words
- Custom words: User-provided input via modal

#### Main Application (`app.js`)
The Vue.js application is configured with:

**Data Structure:**
- Each data source (bigrams, trigrams, etc.) has independent settings:
  - `scope`: Top 50/100/150/200 items to use
  - `combination`: Number of items combined per phrase
  - `repetition`: How many times each combination repeats
  - `minimumWPM`: Required words per minute threshold
  - `minimumAccuracy`: Required accuracy percentage
  - `phrases`: Generated lesson content
  - `phrasesCurrentIndex`: Current lesson position
  - `WPMs`: Array of achieved WPM scores

**Key Features:**
1. **Lesson Generation**: Dynamically creates phrases by combining n-grams
2. **Performance Tracking**: Real-time WPM and accuracy calculation
3. **Threshold Enforcement**: Users must meet minimum performance to progress
4. **Sound Effects**: Audio feedback for correct/incorrect typing
5. **Persistent Storage**: Settings saved in localStorage
6. **Timer Integration**: Uses ez.countimer.js for session timing

#### User Interface (`index.html`)
- Settings panel with radio buttons for source selection
- Scope selection (Top 50/100/150/200)
- Generator controls (combination/repetition inputs)
- Threshold controls (WPM/accuracy inputs)
- Typing area with expected phrase display
- Input field with visual feedback
- Statistics display (WPM, accuracy, average WPM)

## Application Flow

### 1. Initialization
- Loads saved data from localStorage or uses defaults
- Generates initial lesson phrases
- Sets up event handlers and audio objects

### 2. Lesson Generation
- Takes top N items from selected data source (based on scope)
- Shuffles the data randomly
- Combines items according to combination setting
- Repeats each combination according to repetition setting
- Example: combination=3, repetition=2 → "the and of the and of"

### 3. Typing Session
- User types the expected phrase
- Real-time validation with visual/audio feedback
- Tracks correct/incorrect keystrokes
- Calculates WPM and accuracy when phrase is completed

### 4. Performance Evaluation
- Compares results against minimum thresholds
- If thresholds not met: resets current phrase, plays failure sound
- If thresholds met: adds WPM to history, advances to next phrase
- When all phrases completed: generates new shuffled lesson

### 5. Progression Logic
- Lessons cycle through phrases in current configuration
- When round completes, user manually adjusts settings for progression
- WPM averages reset at start of each new round

## Key Methods

### Lesson Management
- `generatePhrases()`: Creates lesson content from n-gram data
- `refreshPhrases()`: Regenerates and resets current lesson
- `nextPhrase()`: Advances to next phrase or restarts lesson

### Performance Tracking
- `keyHandler()`: Processes each keystroke and validates input
- WPM calculation: `(characters/5) / (time_in_minutes) * 60`
- Accuracy: `correct_hits / total_hits * 100`

### Data Persistence
- `save()`: Stores current state to localStorage
- `load()`: Restores state from localStorage
- Version management for data schema updates

## Settings System
Each data source maintains independent configuration:
- Source type (bigrams/trigrams/tetragrams/words/custom)
- Scope limitation for focused practice
- Generation parameters (combination/repetition)
- Performance thresholds (WPM/accuracy)
- Progress tracking (current lesson, WPM history)

The application provides a comprehensive typing training environment with granular control over difficulty progression and performance requirements.