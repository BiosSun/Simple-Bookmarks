(function($, B) {
    'use strict';

    var BM_ITEM_TYPE_DIRECTORY = 1,
        BM_ITEM_TYPE_BOOKMARK = 2,
        BM_ITEM_TYPE_SEPARATOR = 3,

        STORAGE_KEY_IS_OPEN = '1',

        _rspace = /\s/g,
        _rseparator = /[\s-]/g,

        bmRootList = $('#bookmarks'),
        searchInput = $('#search'),
        bmItems = {
            allItems: [],
            allBookmarkItems: []
        };

    B.init(function() {
        // 构建默认书签列表
        chrome.bookmarks.getChildren(B.rootFolderId, function(nodes) {
            var i, l;
            for (i = 0, l = nodes.length; i < l; i++) {
                var item = createBMItem(nodes[i]);
                bmRootList.append(item.el);

                if (item.isOpen) {
                    openBMItem(item, false);
                }
            }
        });

        // 绑定书签项的点击事件
        bmRootList.on('click', '.bm-item-title', function(e) {
            var itemEl = $(this).closest('.bm-item'),
                item = bmItems[itemEl.attr('data-id')],

                isCtrlMeta = e.ctrlKey || e.metaKey,
                isShift = e.shiftKey,

                url;

            if (itemEl.hasClass('bm-item-directory')) {
                toggleBMItem(item);
            }
            else if (itemEl.hasClass('bm-item-bookmark')) {
                url = item.data.url;

                if (isCtrlMeta) {
                    B.openBookmarksNewTab(url, true);
                }
                else if (isShift) {
                    B.openBookmarksNewWindow(url);
                }
                else {
                    B.openBookmarkCurrentTab(url, true);
                }
            }

            return false;
        });

        // 绑定即时搜索相关事件
        searchInput.on('keyup', function() {
            var input = $(this);
            searchItems(input.val());
        });

        // 绑定右键菜单
        $.contextMenu({
            selector: '.bm-item-bookmark .bm-item-title',
            callback: function(key, options) {
                console.info(key, options);
                contextMenuHandler(key, options);
            },
            items: {
                open: { name: '打开书签' },
                openInNewTab : { name: '在新标签页中打开书签' },
                openInNewWindow : { name: '在新窗口中打开书签' },
                openInStealthWindow : { name: '在隐身窗口中打开书签' },
                sep1 : '----------',
                edit : { name: '编辑' },
                delete : { name: '删除' }
            }
        });
        $.contextMenu({
            selector: '.bm-item-separator .bm-item-title',
            callback: function(key, options) {
                console.info(key, options);
                contextMenuHandler(key, options);
            },
            items: {
                edit : { name: '编辑' },
                delete : { name: '删除' }
            }
        });
        $.contextMenu({
            selector: '.bm-item-directory .bm-item-title',
            callback: function(key, options) {
                console.info(key, options);
                contextMenuHandler(key, options);
            },
            items: {
                openAllInNewTab : { name: '在新标签页中打开全部书签' },
                openAllInNewWindow : { name: '在新窗口中打开全部书签' },
                openAllInStealthWindow : { name: '在隐身窗口中打开全部书签' },
                sep1 : '----------',
                edit : { name: '编辑' },
                delete : { name: '删除' }
            }
        });
    });

    // 处理右键菜单点击事件
    function contextMenuHandler(key, options) {
        var item = bmItems[options.$trigger.closest('.bm-item').attr('data-id')];

        switch(key) {
            case 'open' :
                B.openBookmarkCurrentTab(item.data.url, true);
                break;
            case 'openInNewTab' :
                B.openBookmarksNewTab(item.data.url, true);
                break;
            case 'openInNewWindow' :
                B.openBookmarksNewWindow(item.data.url);
                break;
            case 'openInStealthWindow' :
                B.openBookmarksNewWindow(item.data.url, true);
                break;
        }
    }


    // 根据一个字符串查询书签项
    function searchItems(searchText) {
        var result = [];

        searchText = $.trim(searchText).toLowerCase();

        if (searchText) {
            bmRootList.children().detach();

            $.each(bmItems.allBookmarkItems, function(i, item) {
                var title = item.data.title.toLowerCase(),
                    url = item.data.url.toLowerCase();

                if (title.indexOf(searchText) !== -1 ||
                   url.indexOf(searchText) !== -1) {
                    result.push(item);
                }
            });
        }
        else {
            result = bmItems.allItems;
        }

        $.each(result, function(i, item) {
            insertItem(item);
        });
    }

    // 切换一个书签目录项的打开与关闭状态
    function toggleBMItem(item, sw) {
        if (sw || !item.isOpen) {
            openBMItem(item);
        }
        else {
            closeBMItem(item);
        }
    }

    // 打开一个书签目录项
    function openBMItem(item, animate) {
        item.isOpen = true;
        item.el.addClass('open');

        // 存储打开状态
        B.storage(
            item.id + '-' + STORAGE_KEY_IS_OPEN,
            true);


        // 插入子书签项
        chrome.bookmarks.getChildren(item.id + '', function(subnodes) {
            var subitem, i, l;

            for (i = 0, l = subnodes.length; i < l; i++) {
                subitem = createBMItem(subnodes[i]);
                item.sublistEl.append(subitem.el);

                if (subitem.isOpen) {
                    openBMItem(subitem, animate);
                }
            }

            if (animate !== false) {
                item.sublistEl.slideDown();
            }
            else {
                item.sublistEl.show();
            }
        });

    }

    // 打开一个书签目录项
    function closeBMItem(item) {
        item.isOpen = false;
        item.el.removeClass('open');

        item.sublistEl.slideUp();

        B.storage(
            item.id + '-' + STORAGE_KEY_IS_OPEN,
            undefined);
    }

    /**
     * 创建并注册一个书签项，如果该书签项已被创建，则不再重新创建，而是返回已有的。
     */
    function createBMItem(node) {
        var item = bmItems[node.id];

        if (!item) {
            item = {
                id: node.id,
                data: node,
                isOpen: B.storage(node.id + '-' + STORAGE_KEY_IS_OPEN)
            };

            // bookmark
            if (node.url) {
                // separator bookmark
                if (node.title.replace(_rspace, '').substring(0, 5) === '-----') {
                    item.el = createBMSeparatorItemEl(node);
                    item.type = BM_ITEM_TYPE_SEPARATOR;
                }
                // common bookmark
                else {
                    item.el = createBMBookmarkItemEl(node);
                    item.type = BM_ITEM_TYPE_BOOKMARK;
                    bmItems.allBookmarkItems.push(item);
                }
            }
            // folder
            else {
                item.el = createBMDirectoryItemEl(node);
                item.sublistEl = item.el.find('> .bm-sublist');
                item.type = BM_ITEM_TYPE_DIRECTORY;
            }

            bmItems[node.id] = item;
            bmItems.allItems.push(item);
        }

        return item;
    }

    function createBMDirectoryItemEl(node) {
        return $(
            '<li id="bmitem-' + node.id + '" class="bm-item bm-item-directory"' +
                ' data-id="' + node.id + '"' +
                ' data-index="' + node.index + '">' +
                '<span class="bm-item-title">' +
                    '<i class="bm-item-favicon"></i>' +
                    node.title +
                '</span>' +
                '<ul class="bm-sublist" style="display:none"></ul>' +
            '</li>'
        );
    }

    function createBMBookmarkItemEl(node) {
        return $(
            '<li id="bmitem-' + node.id + '" class="bm-item bm-item-bookmark"' +
                ' data-id="' + node.id + '"' +
                ' data-index="' + node.index + '">' +
                '<a class="bm-item-title" href="' + node.url + '">' +
                    '<i class="bm-item-favicon">' +
                        '<img src="chrome://favicon/' + node.url + '" />' +
                    '</i>' +
                    node.title +
                '</a>' +
            '</li>'
        );
    }

    function createBMSeparatorItemEl(node) {
        var title = node.title.replace(_rseparator, '');
        return $(
            '<li id="bmitem-' + node.id + '" class="bm-item bm-item-separator"' +
                ' data-id="' + node.id + '"' +
                ' data-index="' + node.index + '">' +
                '<span class="bm-item-title">' +
                    '<span class="line"></span>' +
                    '<span class="text">' + title + '</span>' +
                '</span>' +
            '</li>'
        );
    }

    /**
     * 将一个书签项插入到书签列表中，
     * 如果当前书签列表中有待插入书签项的父目录项，
     * 则将其插入到父目录项中，
     * 如果父目录项不存在或无法插入到页面中时，
     * 将其插入到根列表下。
     *
     * @param item {Object}
     *     书签项数据对象
     *
     * @param isCreatePath {Boolean}
     *     当父目录项不存在（或没有插入到页面中）时，是否要创建父目录项（或插入到页面中），
     *     若为 false，则会直接将该节点插入到根列表下。
     */
    function insertItem(item, isCreatePath) {
        if (!item) { return; }

        var pId = item.data.parentId,
            pItem = bmItems[pId];

        if (isCreatePath) {
            if (!pItem) {
                chrome.bookmarks.get(pId + '', function(nodes) {
                    var pNode = nodes && nodes[0];

                    if (pNode && B.isCorrectNode(pNode)) {
                        pItem = createBMItem(pNode);
                        insertItem(pItem, isCreatePath);
                    }

                    insert(item);
                });
            }
            else if ( !$.contains(document.body, pItem.el[0]) ) {
                insertItem(pItem, isCreatePath);
                insertToSubList(pItem, item);
            }
            else {
                insert();
            }
        }
        else {
            insert();
        }

        function insert() {
            // 如果父目录项存在，且在页面中
            if (pItem && $.contains(document.body, pItem.el[0])) {
                insertToSubList(pItem, item);
            }
            else {
                insertToRootList(item);
            }
        }

        function insertToRootList(item) {
            bmRootList.append(item.el);
        }

        function insertToSubList(parentItem, subItem) {
            parentItem.sublistEl.append(subItem.el);
        }
    }
})(jQuery, simpleBookmarks);
