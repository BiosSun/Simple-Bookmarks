// Generated on 2014-07-29 using generator-webapp 0.4.9
'use strict';

// # Globbing
// for performance reasons we're only matching one level down:
// 'test/spec/{,*/}*.js'
// use this if you want to recursively match all subfolders:
// 'test/spec/**/*.js'

module.exports = function (grunt) {

    // Load grunt tasks automatically
    require('load-grunt-tasks')(grunt);

    // Time how long tasks take. Can help when optimizing build times
    require('time-grunt')(grunt);

    // Configurable paths
    var config = {
        app: 'app',
        dist: 'dist',

        appCSS: 'app/styles',
        appJS: 'app/scripts',
        appSASS: 'app/sass',
        appFonts: 'app/fonts',
        appImages: 'app/images',

        distCSS: 'dist/styles',
        distJS: 'dist/scripts',
        distSASS: 'dist/sass',
        distFonts: 'dist/fonts',
        distImages: 'dist/images',

        httpCSS: 'styles',
        httpJS: 'scripts',
        httpSASS: 'sass',
        httpFonts: 'fonts',
        httpImages: 'images'
    };

    // Define the configuration for all the tasks
    grunt.initConfig({

        // Project settings
        config: config,

        // Empties folders to start fresh
        clean: {
            dist: {
                files: [{
                    dot: true,
                    src: [
                        '<%= config.dist %>'
                    ]
                }]
            }
        },

        mkdir: {
            dist: {
                options: {
                    create: ['<%= config.dist %>']
                }
            }
        },

        // Make sure code styles are up to par and there are no obvious mistakes
        jshint: {
            options: {
                jshintrc: '.jshintrc',
                reporter: require('jshint-stylish')
            },
            all: [
                'Gruntfile.js',
                '<%= config.appJS %>/**/*.js',
                '!<%= config.appJS %>/vendors/**/*',
                'test/spec/**/*.js'
            ]
        },

        // Compiles Compass to CSS
        compass: {
            src: {
                options: {
                    httpPath: '',
                    cssDir: '<%= config.appCSS %>',
                    sassDir: '<%= config.appSASS %>',
                    imageDir: '<%= config.appImages %>',
                    javascriptsDir: '<%= config.appJS %>',
                    fontsDir: '<%= config.appFonts %>',
                    httpStylesheetsPath: '<%= config.httpCSS %>',
                    httpImagesPath: '<%= config.httpImages %>',
                    httpJavascriptsPath: '<%= config.httpJS %>',
                    httpFontsPath: '<%= config.httpFonts %>'
                }
            }
        },

        // Add vendor prefixed styles
        autoprefixer: {
            options: {
                browsers: ['last 4 Chrome version']
            },
            src: {
                files: [{
                    expand: true,
                    cwd: '<%= config.appCSS %>',
                    src: '**/*.css',
                    dest: '<%= config.appCSS %>'
                }]
            }
        },

        // The following *-min tasks produce minified files in the dist folder
        imagemin: {
            dist: {
                files: [{
                    expand: true,
                    cwd: '<%= config.distImages %>',
                    src: '**/*.{gif,jpeg,jpg,png}',
                    dest: '<%= config.distImages %>'
                }]
            }
        },

        cssmin: {
            dist: {
                expand: true,
                cwd: '<%= config.distCSS %>',
                src: ['**/*.css'],
                dest: '<%= config.distCSS %>'
            }
        },

        uglify: {
            dist: {
                files: [{
                    expand: true,
                    cwd: '<%= config.distJS %>',
                    src: ['**/*.js'],
                    dest: '<%= config.distJS %>'
                }]
            }
        },

        // Copies remaining files to places other tasks can use
        copy: {
            dist: {
                expand: true,
                cwd: '<%= config.app %>/',
                src: '**/*',
                dest: '<%= config.dist %>/'
            }
        },

        bower: {
            install: {
                options: {
                    targetDir: '<%= config.appJS %>/vendors',
                    cleanTargetDir: true,
                    layout: 'byComponent'
                }
            }
        },

        // Watches files for changes and runs tasks based on the changed files
        watch: {
            gruntfile: {
                files: ['Gruntfile.js']
            },
            bower: {
                files: ['bower.json'],
                tasks: ['bower']
            },
            scripts: {
                files: ['<%= config.appJS %>/**/*.js'],
                tasks: ['jshint']
            },
            scss: {
                files: ['<%= config.appSASS %>/**/*.{scss,sass}'],
                tasks: ['compass', 'autoprefixer']
            }
        }
    });

    grunt.registerTask('build', [
        'clean',
        'mkdir',

        'compass',
        'autoprefixer',

        'bower',
        'copy',

        'uglify',
        'cssmin',
        'imagemin'
    ]);

    grunt.registerTask('default', [
        'jshint',
        'build'
    ]);
};
