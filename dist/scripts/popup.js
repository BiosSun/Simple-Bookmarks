$(function(){"use strict";function a(a){var b=[];a=$.trim(a).toLowerCase(),a?(r.children().detach(),$.each(t.allBookmarkItems,function(c,d){var e=d.data.title.toLowerCase(),f=d.data.url.toLowerCase();(-1!==e.indexOf(a)||-1!==f.indexOf(a))&&b.push(d)})):b=t.allItems,$.each(b,function(a,b){j(b)})}function b(a,b){b||!a.isOpen?c(a):d(a)}function c(a){a.isOpen=!0,a.el.addClass("open"),a.sublistEl&&a.sublistEl.slideDown();var b={};b[a.id+"-"+o]=!0,chrome.storage.local.set(b)}function d(a){a.isOpen=!1,a.el.removeClass("open"),a.sublistEl&&a.sublistEl.slideUp(),chrome.storage.local.remove(a.id+"-"+o)}function e(a,b){var c={id:a.id,data:a},d=c.id+"-"+o;return a.title?(a.children?(c.el=f(a),c.type=l):"-----"===a.title.replace(p,"").substring(0,5)?(c.el=h(a),c.type=n):a.url&&(c.el=g(a),c.type=m,t.allBookmarkItems.push(c)),t[a.id]=c,t.allItems.push(c),void chrome.storage.local.get(d,function(a){c.isOpen=a[d],b(c)})):null}function f(a){return $('<li id="bmitem-'+a.id+'" class="bm-item bm-item-directory" data-id="'+a.id+'" data-index="'+a.index+'"><span class="bm-item-title"><i class="bm-item-favicon"></i>'+a.title+"</span></li>")}function g(a){return $('<li id="bmitem-'+a.id+'" class="bm-item bm-item-bookmark" data-id="'+a.id+'" data-index="'+a.index+'"><a class="bm-item-title" href="'+a.url+'"><i class="bm-item-favicon"><img src="chrome://favicon/'+a.url+'" /></i>'+a.title+"</a></li>")}function h(a){var b=a.title.replace(q,"");return $('<li id="bmitem-'+a.id+'" class="bm-item bm-item-separator" data-id="'+a.id+'" data-index="'+a.index+'"><span class="bm-item-title"><span class="line"></span><span class="text">'+b+"</span></span></li>")}function i(a){var b=$('<ul class="bm-sublist"></ul>');return a.el.append(b),a.sublistEl=b,a.isOpen!==!0&&b.css("display","none"),b}function j(a,b){function c(){h&&$.contains(document.body,h.el[0])?f(h,a):d(a)}function d(a){r.append(a.el)}function f(a,b){a.sublistEl||i(a),a.sublistEl.append(b.el)}if(a){var g=a.data.parentId,h=t[g];b?h?$.contains(document.body,h.el[0])?c():(j(h,b),f(h,a)):chrome.bookmarks.get(g+"",function(d){var f=d&&d[0];f&&simpleBookmarks.isCorrectNode(f)?h=e(f,function(d){j(d,b),c(a)}):c(a)}):c()}}var k=$(document),l=1,m=2,n=3,o="1",p=/\s/g,q=/[\s-]/g,r=$("#bookmarks"),s=$("#search"),t={allItems:[],allBookmarkItems:[]};simpleBookmarks.traversalBookmarks(function(a){e(a,function(a){j(a,!0)})}),k.on("click",".bm-item-title",function(a){var c,d=$(this).closest(".bm-item"),e=t[d.attr("data-id")],f=a.ctrlKey||a.metaKey,g=a.shiftKey;return d.hasClass("bm-item-directory")?b(e):d.hasClass("bm-item-bookmark")&&(c=e.data.url,f?simpleBookmarks.openBookmarksNewTab(c,!0):g?simpleBookmarks.openBookmarksNewWindow(c):simpleBookmarks.openBookmarkCurrentTab(c,!0)),!1}),s.on("keyup",function(){var b=$(this);a(b.val())})});