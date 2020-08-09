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

        // Package Informations
        pkg: grunt.file.readJSON( 'package.json' ),

        // Empties folders to start fresh
        clean: {
            dist: {
                files: [{
                    dot: true,
                    src: ['dist']
                }]
            },
            app: {
                files: [{
                    dot: true,
                    src: ['app/styles']
                }]
            }
        },

        mkdir: {
            dist: {
                options: {
                    create: ['dist']
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
                'app/scripts/**/*.js',
                '!app/scripts/vendors/**/*',
                'test/spec/**/*.js'
            ]
        },

        // Compiles sass to CSS
        sass: {
            dist: {
                files: [{
                    expand: true,
                    cwd: 'app/sass',
                    src: '*.scss',
                    dest: 'dist/styles',
                    ext: '.css'
                }]
            }
        },

        // Add vendor prefixed styles
        autoprefixer: {
            options: {
                browsers: ['last 2 versions']
            },
            src: {
                expand: true,
                src: 'app/styles/**/*.css'
            }
        },

        // The following *-min tasks produce minified files in the dist folder
        imagemin: {
            dist: {
                files: [{
                    expand: true,
                    cwd: 'dist/images',
                    src: '**/*.{gif,jpeg,jpg,png}',
                    dest: 'dist/images'
                }]
            }
        },

        cssmin: {
            dist: {
                expand: true,
                cwd: 'dist/styles',
                src: ['**/*.css'],
                dest: 'dist/styles'
            }
        },

        uglify: {
            dist: {
                files: [{
                    expand: true,
                    cwd: 'dist/scripts',
                    src: ['**/*.js'],
                    dest: 'dist/scripts'
                }]
            }
        },

        // Copies remaining files to places other tasks can use
        copy: {
            dist: {
                expand: true,
                cwd: 'app/',
                src: '**/*',
                dest: 'dist/'
            }
        },

        bower: {
            install: {
                options: {
                    targetDir: 'app/scripts/vendors',
                    // cleanTargetDir: true,
                    layout: 'byComponent'
                }
            }
        },

        replace: {
            dist: {
                options: {
                    patterns: [
                        {
                            match: 'VERSION',
                            replacement: '<%= pkg.version %>'
                        }
                    ]
                },
                files: [
                    {
                        expand: true,
                        cwd: 'dist/',
                        src: [
                            '**/*',
                            '!**/vendors/**/*',
                            '!{images,fonts}/**/*'
                        ],
                        dest: 'dist/'
                    }
                ]
            }
        },

        // Watches files for changes and runs tasks based on the changed files
        watch: {
            gruntfile: {
                files: ['Gruntfile.js']
            },
            bower: {
                files: ['bower.json'],
                tasks: ['bower', 'copy', 'replace']
            },
            scripts: {
                files: ['app/scripts/**/*.js'],
                tasks: ['copy', 'replace']
            },
            scss: {
                files: ['app/sass/**/*.{scss,sass}'],
                tasks: ['sass', 'autoprefixer', 'copy', 'replace']
            },
            file: {
                files: ['app/*.{html,json}'],
                tasks: ['copy', 'replace']
            }
        }
    });

    grunt.registerTask('build', [
        'clean',
        'mkdir',

        'sass',
        'autoprefixer',

        'bower',
        'copy',

        'uglify',
        'cssmin',
        'imagemin',

        'replace'
    ]);

    grunt.registerTask('default', [
        'jshint',
        'build'
    ]);
};
