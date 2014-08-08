$(function() {
    'use strict';

    var doc = $(document),

        BM_ITEM_TYPE_DIRECTORY = 1,
        BM_ITEM_TYPE_BOOKMARK = 2,
        BM_ITEM_TYPE_SEPARATOR = 3,

        _rspace = /\s/g,
        _rseparator = /[\s-]/g,

        bmRootList = $('#bookmarks'),
        searchInput = $('#search'),
        bmItems = {
            allItems: [],
            allBookmarkItems: []
        };

    simpleBookmarks.traversalBookmarks(
        function(node) {
            var item = createBMItem(node);
            insertItem(item, true);
        }
    );

    doc.on('click', '.bm-item-title', function(e) {
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
                simpleBookmarks.openBookmarksNewTab(url, true);
            }
            else if (isShift) {
                simpleBookmarks.openBookmarksNewWindow(url);
            }
            else {
                simpleBookmarks.openBookmarkCurrentTab(url, true);
            }
        }

        return false;
    });

    searchInput.on('keyup', function() {
        var input = $(this);
        searchItems(input.val());
    });

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
    function openBMItem(item) {
        item.isOpen = true;
        item.el.addClass('open');

        if (item.sublistEl) {
            item.sublistEl.slideDown();
        }
    }

    // 打开一个书签目录项
    function closeBMItem(item) {
        item.isOpen = false;
        item.el.removeClass('open');

        if (item.sublistEl) {
            item.sublistEl.slideUp();
        }
    }

    /**
     * 创建并注册一个书签项
     */
    function createBMItem(node) {
        var item = {
            id: node.id,
            data: node
        };

        if (!node.title) { return null; }

        if (node.children) {
            item.el = createBMDirectoryItemEl(node);
            item.type = BM_ITEM_TYPE_DIRECTORY;
        }
        else if (node.title.replace(_rspace, '').substring(0, 5) === '-----') {
            item.el = createBMSeparatorItemEl(node);
            item.type = BM_ITEM_TYPE_SEPARATOR;
        }
        else if (node.url) {
            item.el = createBMBookmarkItemEl(node);
            item.type = BM_ITEM_TYPE_BOOKMARK;
            bmItems.allBookmarkItems.push(item);
        }

        bmItems[node.id] = item;
        bmItems.allItems.push(item);

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

    // 创建一个书签子列表
    function createBMSubList(item) {
        var listEl = $('<ul class="bm-sublist"></ul>');

        item.el.append(listEl);
        item.sublistEl = listEl;

        if (item.isOpen !== true) {
            listEl.css('display', 'none');
        }

        return listEl;
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

                    if (pNode && simpleBookmarks.isCorrectNode(pNode)) {
                        pItem = createBMItem(pNode);
                        insertItem(item, isCreatePath);
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
            if (!parentItem.sublistEl) {
                createBMSubList(parentItem);
            }

            parentItem.sublistEl.append(subItem.el);
        }
    }
});
