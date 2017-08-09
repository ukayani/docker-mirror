'use strict';
const gulp = require('gulp');
const eslint = require('gulp-eslint');
const istanbul = require('gulp-istanbul');
const mocha = require('gulp-mocha');
const zip = require('gulp-zip');
const install = require('gulp-install');
const del = require('del');

const libFiles = ['main.js', 'lib/**/*.js'];
const testFiles = ['test/**/*.js'];
const allFiles = libFiles.concat(testFiles);

const prodFiles = libFiles.concat(['package.json', 'start.sh']);

gulp.task('pre-test', () => {
  return gulp.src(libFiles)
             // Covering files
             .pipe(istanbul())
             // Force `require` to return covered files
             .pipe(istanbul.hookRequire());
});

gulp.task('test', ['pre-test'], () => {
  return gulp.src(testFiles)
             .pipe(mocha())
             // Creating the reports after tests ran
             .pipe(istanbul.writeReports())
             // Enforce a coverage of at least 90%
             .pipe(istanbul.enforceThresholds({thresholds: {global: 70}}));

});

gulp.task('lint', () => {
  return gulp.src(allFiles)
             .pipe(eslint())
             .pipe(eslint.format())
             .pipe(eslint.failOnError())
});

gulp.task('clean', () => {
  return del(['dist']);
});

gulp.task('dist', ['clean'], () => {
  return gulp.src(prodFiles, {base: '.'})
             .pipe(gulp.dest('./dist'))
             .pipe(install({production: true}));
});

gulp.task('package', ['dist'], () => {
  return gulp.src(['dist/**'], {base: 'dist/'})
             .pipe(zip(pkg.name + '.zip'))
             .pipe(gulp.dest('./dist'));
});

gulp.task('default', ['lint', 'test']);
